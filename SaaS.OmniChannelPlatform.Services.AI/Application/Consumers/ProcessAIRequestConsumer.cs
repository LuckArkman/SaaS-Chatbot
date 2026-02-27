using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.AI.Infrastructure.Mcp;
using SaaS.OmniChannelPlatform.Services.AI.Infrastructure.AI;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.AI.Application.Consumers
{
    public class ProcessAIRequestConsumer : IConsumer<ProcessAIRequestIntegrationEvent>
    {
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<ProcessAIRequestConsumer> _logger;
        private readonly McpClient _mcpClient;
        private readonly IAIService _aiService;

        public ProcessAIRequestConsumer(
            IPublishEndpoint publishEndpoint, 
            ILogger<ProcessAIRequestConsumer> logger, 
            McpClient mcpClient,
            IAIService aiService)
        {
            _publishEndpoint = publishEndpoint;
            _logger = logger;
            _mcpClient = mcpClient;
            _aiService = aiService;
        }

        public async Task Consume(ConsumeContext<ProcessAIRequestIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing AI Request for Tenant: {TenantId} via MCP + Gemini", @event.TenantId);

            // 1. Fetch Context via MCP
            var contextData = await _mcpClient.GetConversationContextAsync(@event.TenantId, @event.ExternalId);
            
            // 2. Build Rich Prompt with Context
            var promptBuilder = new System.Text.StringBuilder();
            if (contextData != null && contextData.Messages.Any())
            {
                promptBuilder.AppendLine("Histórico de Conversa (Contexto):");
                foreach (var msg in contextData.Messages)
                {
                    promptBuilder.AppendLine($"{msg.Role.ToUpper()}: {msg.Content}");
                }
                promptBuilder.AppendLine("---");
            }
            
            promptBuilder.AppendLine($"Mensagem Recente do Usuário: {@event.UserContent}");

            // 3. Generate AI Response
            var aiResponse = await _aiService.GetCompletionAsync(promptBuilder.ToString(), @event.SystemPrompt);

            // 4. Publish Response
            await _publishEndpoint.Publish(new AIResponseIntegrationEvent(
                @event.TenantId, @event.ConversationId, aiResponse, @event.Channel, @event.ExternalId));

            _logger.LogInformation("AI Response generated and published for Tenant: {TenantId}", @event.TenantId);
        }
    }
}
