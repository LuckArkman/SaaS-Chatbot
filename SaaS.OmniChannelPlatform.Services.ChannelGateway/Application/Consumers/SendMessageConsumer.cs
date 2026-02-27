using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Consumers
{
    public class SendMessageConsumer : 
        IConsumer<SendMessageIntegrationEvent>,
        IConsumer<AIResponseIntegrationEvent>
    {
        private readonly IEnumerable<IChannelProvider> _providers;
        private readonly ILogger<SendMessageConsumer> _logger;

        public SendMessageConsumer(IEnumerable<IChannelProvider> providers, ILogger<SendMessageConsumer> logger)
        {
            _providers = providers;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<SendMessageIntegrationEvent> context)
        {
            var @event = context.Message;
            await SendAsync(@event.TenantId, @event.Channel, @event.RecipientExternalId, @event.Content, "Static/Manual");
        }

        public async Task Consume(ConsumeContext<AIResponseIntegrationEvent> context)
        {
            var @event = context.Message;
            await SendAsync(@event.TenantId, @event.Channel, @event.ExternalId, @event.AIContent, "AI/Bot");
        }

        private async Task SendAsync(Guid tenantId, string channel, string recipient, string content, string messageSource)
        {
            _logger.LogInformation("Processing {Source} message for Tenant: {TenantId}, Channel: {Channel}", messageSource, tenantId, channel);

            var provider = _providers.FirstOrDefault(p => p.ChannelName.Equals(channel, System.StringComparison.OrdinalIgnoreCase));

            if (provider == null)
            {
                _logger.LogError("Channel provider not found for: {Channel}", channel);
                return;
            }

            try
            {
                await provider.SendMessageAsync(recipient, content);
                _logger.LogInformation("Message sent successfully to {Recipient} via {Channel}", recipient, channel);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Failed to send message to {Recipient} via {Channel}", recipient, channel);
            }
        }
    }
}
