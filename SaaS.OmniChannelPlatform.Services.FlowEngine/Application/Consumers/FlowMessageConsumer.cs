using MassTransit;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.FlowEngine.Application.Consumers
{
    public class FlowMessageConsumer : IConsumer<MessageReceivedIntegrationEvent>
    {
        private readonly FlowDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<FlowMessageConsumer> _logger;

        public FlowMessageConsumer(FlowDbContext context, IPublishEndpoint publishEndpoint, ILogger<FlowMessageConsumer> logger)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<MessageReceivedIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing flow for Tenant: {TenantId}, User: {ExternalId}", @event.TenantId, @event.SenderExternalId);

            // 1. Get or create session
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.ExternalId == @event.SenderExternalId && s.TenantId == @event.TenantId && !s.IsCompleted);

            if (session != null && session.IsHandedOver)
            {
                _logger.LogInformation("Session handed over to human. Skipping bot.");
                return;
            }

            if (session == null)
            {
                // Find first active flow for tenant
                var flow = await _context.Flows
                    .Include(f => f.Steps)
                    .FirstOrDefaultAsync(f => f.TenantId == @event.TenantId && f.IsActive);

                if (flow == null || !flow.Steps.Any())
                {
                    _logger.LogWarning("No active flow found for Tenant: {TenantId}", @event.TenantId);
                    return;
                }

                var firstStep = flow.Steps.OrderBy(s => s.Order).First();
                
                session = new FlowSession
                {
                    TenantId = @event.TenantId,
                    ExternalId = @event.SenderExternalId,
                    CurrentStepId = firstStep.Id,
                    LastInteraction = DateTime.UtcNow
                };
                _context.Sessions.Add(session);
                await _context.SaveChangesAsync();

                await SendResponse(context, firstStep, @event);
            }
            else
            {
                // Process input and move to next step
                var currentStep = await _context.Steps.FindAsync(session.CurrentStepId);
                if (currentStep == null) return;

                FlowStep? nextStep = null;

                if (currentStep.Type == StepType.InternalModel)
                {
                    var csvData = currentStep.Metadata.ContainsKey("CsvData") ? currentStep.Metadata["CsvData"] : "";
                    if (TryMatchInternalModel(csvData, @event.Content, out var preProgrammedResponse))
                    {
                        // Found in CSV: Send response and move to NextStepId (Found path)
                        await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                            @event.TenantId, Guid.Empty, preProgrammedResponse, @event.SenderExternalId, @event.Channel));
                        
                        if (currentStep.NextStepId.HasValue)
                            nextStep = await _context.Steps.FindAsync(currentStep.NextStepId.Value);
                    }
                    else
                    {
                        // Not found in CSV: Move to FallbackStepId (AI path)
                        if (currentStep.FallbackStepId.HasValue)
                            nextStep = await _context.Steps.FindAsync(currentStep.FallbackStepId.Value);
                    }
                }
                else
                {
                    // Linear or Linked navigation
                    if (currentStep.NextStepId.HasValue)
                    {
                        nextStep = await _context.Steps.FindAsync(currentStep.NextStepId.Value);
                    }
                    else
                    {
                        // Fallback to order if no specific link exists
                        nextStep = await _context.Steps
                            .Where(s => s.FlowDefinitionId == currentStep.FlowDefinitionId && s.Order > currentStep.Order)
                            .OrderBy(s => s.Order)
                            .FirstOrDefaultAsync();
                    }
                }

                if (nextStep != null)
                {
                    session.CurrentStepId = nextStep.Id;
                    session.LastInteraction = DateTime.UtcNow;
                    
                    if (nextStep.Type == StepType.Handover)
                    {
                        session.IsHandedOver = true;
                        await _context.SaveChangesAsync();

                        // Notify dashboard via event bus — Chat service will push to SignalR
                        await _publishEndpoint.Publish(new HandoverIntegrationEvent(
                            @event.TenantId,
                            @event.SenderExternalId,
                            @event.Channel,
                            @event.SenderName,
                            nextStep.Content  // Farewell message configured in the Handover node
                        ));

                        // Send the handover farewell message to the user
                        if (!string.IsNullOrEmpty(nextStep.Content))
                        {
                            await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                                @event.TenantId, Guid.Empty, nextStep.Content, @event.SenderExternalId, @event.Channel));
                        }

                        return;
                    }

                    await _context.SaveChangesAsync();
                    
                    // If the step just sent a response (InternalModel found), we might want to stop or move again.
                    // But for now, if it's not a router-only node, we send the content of the next step.
                    if (nextStep.Type != StepType.InternalModel)
                    {
                        await SendResponse(context, nextStep, @event);
                    }
                }
                else
                {
                    session.IsCompleted = true;
                    await _context.SaveChangesAsync();
                }
            }
        }

        private bool TryMatchInternalModel(string csvData, string input, out string response)
        {
            response = string.Empty;
            if (string.IsNullOrEmpty(csvData)) return false;

            var lines = csvData.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split(';'); // Using semicolon as default CSV separator
                if (parts.Length >= 2)
                {
                    var expectedInput = parts[0].Trim();
                    var programmedOutput = parts[1].Trim();

                    if (string.Equals(input.Trim(), expectedInput, StringComparison.OrdinalIgnoreCase))
                    {
                        response = programmedOutput;
                        return true;
                    }
                }
            }
            return false;
        }

        private async Task SendResponse(ConsumeContext<MessageReceivedIntegrationEvent> context, FlowStep step, MessageReceivedIntegrationEvent originalEvent)
        {
            if (step.Type == StepType.Handover)
            {
                _logger.LogInformation("Flow reached Handover. No automated response sent.");
                return;
            }

            if (step.Type == StepType.Ai)
            {
                _logger.LogInformation("Step is AI. Publishing AI Request.");
                await _publishEndpoint.Publish(new ProcessAIRequestIntegrationEvent(
                    originalEvent.TenantId,
                    Guid.Empty,
                    originalEvent.Content,
                    originalEvent.Channel,
                    originalEvent.SenderExternalId,
                    step.Content // System Prompt can be stored in step.Content for AI steps
                ));
                return;
            }

            if (step.Type == StepType.InternalModel)
            {
                // This shouldn't normally be called directly for InternalModel because Consume handles it,
                // but if it is, we just process the logic.
                return;
            }

            await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                originalEvent.TenantId,
                Guid.Empty,
                step.Content,
                originalEvent.SenderExternalId,
                originalEvent.Channel
            ));
        }
    }
}
