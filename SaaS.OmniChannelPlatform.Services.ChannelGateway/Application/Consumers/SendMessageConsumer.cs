using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Consumers
{
    public class SendMessageConsumer : IConsumer<SendMessageIntegrationEvent>
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
            _logger.LogInformation("Processing SendMessage event for Tenant: {TenantId}, Channel: {Channel}", @event.TenantId, @event.Channel);

            var provider = _providers.FirstOrDefault(p => p.ChannelName.Equals(@event.Channel, System.StringComparison.OrdinalIgnoreCase));

            if (provider == null)
            {
                _logger.LogError("Channel provider not found for: {Channel}", @event.Channel);
                return;
            }

            await provider.SendMessageAsync(@event.RecipientExternalId, @event.Content);
        }
    }
}
