using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.FlowEngine.Application.Consumers
{
    public class AIResponseConsumer : IConsumer<AIResponseIntegrationEvent>
    {
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<AIResponseConsumer> _logger;

        public AIResponseConsumer(IPublishEndpoint publishEndpoint, ILogger<AIResponseConsumer> logger)
        {
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<AIResponseIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing AI Response for Tenant: {TenantId}", @event.TenantId);

            // Forward the AI response to the Messaging service to be sent to the user
            await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                @event.TenantId,
                @event.ConversationId,
                @event.AIContent,
                @event.ExternalId,
                @event.Channel
            ));

            _logger.LogInformation("AI Response forwarded to Messaging for Tenant: {TenantId}", @event.TenantId);
        }
    }
}
