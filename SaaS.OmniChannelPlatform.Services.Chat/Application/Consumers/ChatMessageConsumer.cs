using MassTransit;
using Microsoft.AspNetCore.SignalR;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.Chat.API.Hubs;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Chat.Application.Consumers
{
    public class ChatMessageConsumer : 
        IConsumer<MessageReceivedIntegrationEvent>,
        IConsumer<SendMessageIntegrationEvent>
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
                    Type = "Received"
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
    }
}
