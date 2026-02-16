using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.AI.Application.Consumers
{
    public class ProcessAIRequestConsumer : IConsumer<ProcessAIRequestIntegrationEvent>
    {
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<ProcessAIRequestConsumer> _logger;

        public ProcessAIRequestConsumer(IPublishEndpoint publishEndpoint, ILogger<ProcessAIRequestConsumer> logger)
        {
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<ProcessAIRequestIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing AI Request for Tenant: {TenantId}, Content: {UserContent}", @event.TenantId, @event.UserContent);

            // Simulation of AI Call (OpenAI/Gemini)
            await Task.Delay(1500); // Wait for "Intelligence"
            
            string aiResponse = $"Olá! Eu sou o assistente inteligente da plataforma. Recebi sua mensagem: '{@event.UserContent}'. Em que mais posso ajudar?";

            if (@event.UserContent.ToLower().Contains("preço") || @event.UserContent.ToLower().Contains("valor"))
            {
                aiResponse = "Nossos planos começam em R$ 99,90/mês para o plano Lite. Gostaria de conhecer os detalhes dos outros planos?";
            }

            await _publishEndpoint.Publish(new AIResponseIntegrationEvent(
                @event.TenantId,
                @event.ConversationId,
                aiResponse,
                @event.Channel,
                @event.ExternalId
            ));

            _logger.LogInformation("AI Response generated and published for Tenant: {TenantId}", @event.TenantId);
        }
    }
}
