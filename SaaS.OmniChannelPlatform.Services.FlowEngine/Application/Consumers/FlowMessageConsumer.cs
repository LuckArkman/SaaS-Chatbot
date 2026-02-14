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

                // Simple logic: if expecting input, check it. Otherwise take the next step.
                var nextStep = await _context.Steps
                    .Where(s => s.FlowDefinitionId == currentStep.FlowDefinitionId && s.Order > currentStep.Order)
                    .OrderBy(s => s.Order)
                    .FirstOrDefaultAsync();

                if (nextStep != null)
                {
                    session.CurrentStepId = nextStep.Id;
                    session.LastInteraction = DateTime.UtcNow;
                    
                    if (nextStep.Type == StepType.Handover)
                    {
                        session.IsHandedOver = true;
                    }

                    await _context.SaveChangesAsync();
                    await SendResponse(context, nextStep, @event);
                }
                else
                {
                    session.IsCompleted = true;
                    await _context.SaveChangesAsync();
                }
            }
        }

        private async Task SendResponse(ConsumeContext<MessageReceivedIntegrationEvent> context, FlowStep step, MessageReceivedIntegrationEvent originalEvent)
        {
            if (step.Type == StepType.Handover)
            {
                _logger.LogInformation("Flow reached Handover. No automated response sent.");
                return;
            }

            await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                originalEvent.TenantId,
                Guid.Empty, // We don't have the conversation ID here easily, but the Gateway will handle it or we can look it up
                step.Content,
                originalEvent.SenderExternalId,
                originalEvent.Channel
            ));
        }
    }
}
