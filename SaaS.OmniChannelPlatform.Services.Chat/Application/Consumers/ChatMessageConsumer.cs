using MassTransit;
using Microsoft.AspNetCore.SignalR;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.Chat.API.Hubs;
using Microsoft.Extensions.Logging;

namespace SaaS.OmniChannelPlatform.Services.Chat.Application.Consumers
{
    public class ChatMessageConsumer : 
        IConsumer<MessageReceivedIntegrationEvent>,
        IConsumer<SendMessageIntegrationEvent>,
        IConsumer<HandoverIntegrationEvent>
    {
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly ILogger<ChatMessageConsumer> _logger;

        public ChatMessageConsumer(IHubContext<ChatHub> hubContext, ILogger<ChatMessageConsumer> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<MessageReceivedIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Pushing received message to UI. Tenant: {TenantId}", @event.TenantId);

            await _hubContext.Clients.Group(@event.TenantId.ToString())
                .SendAsync("ReceiveMessage", new
                {
                    @event.TenantId,
                    @event.Content,
                    @event.SenderName,
                    @event.Channel,
                    @event.CreationDate,
                    Type = "Received",
                    SenderExternalId = @event.SenderExternalId
                });
        }

        public async Task Consume(ConsumeContext<SendMessageIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Pushing sent message to UI. Tenant: {TenantId}", @event.TenantId);

            await _hubContext.Clients.Group(@event.TenantId.ToString())
                .SendAsync("ReceiveMessage", new
                {
                    @event.TenantId,
                    @event.Content,
                    SenderName = "Bot/Agent",
                    @event.Channel,
                    @event.CreationDate,
                    Type = "Sent"
                });
        }

        public async Task Consume(ConsumeContext<HandoverIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation(
                "Handover triggered for Tenant: {TenantId}, Contact: {ContactName} on {Channel}",
                @event.TenantId, @event.ContactName, @event.Channel);

            // Notify all agents in the tenant's dashboard group about the new handover
            await _hubContext.Clients.Group(@event.TenantId.ToString())
                .SendAsync("ConversationHandedOver", new
                {
                    @event.TenantId,
                    @event.ExternalId,
                    @event.Channel,
                    @event.ContactName,
                    @event.LastBotMessage,
                    @event.CreationDate,
                    Priority = "High",  // Flag this as a priority conversation
                    Message = $"🤝 {@event.ContactName} foi transferido para atendimento humano."
                });
        }
    }
}
