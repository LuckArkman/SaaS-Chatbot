using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.AI.Infrastructure.Mcp;
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

        public ProcessAIRequestConsumer(IPublishEndpoint publishEndpoint, ILogger<ProcessAIRequestConsumer> logger, McpClient mcpClient)
        {
            _publishEndpoint = publishEndpoint;
            _logger = logger;
            _mcpClient = mcpClient;
        }

        public async Task Consume(ConsumeContext<ProcessAIRequestIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing AI Request for Tenant: {TenantId} via MCP", @event.TenantId);

            // 1. Fetch Context via MCP
            var contextData = await _mcpClient.GetConversationContextAsync(@event.TenantId, @event.ExternalId);
            
            // 2. Build Rich Prompt with Context
            var promptBuilder = new System.Text.StringBuilder();
            if (!string.IsNullOrEmpty(@event.SystemPrompt))
            {
                promptBuilder.AppendLine($"[System Prompt]: {@event.SystemPrompt}");
            }
            
            if (contextData != null && contextData.Messages.Any())
            {
                promptBuilder.AppendLine("\n[Histórico de Conversa (MCP Context)]:");
                foreach (var msg in contextData.Messages)
                {
                    promptBuilder.AppendLine($"{msg.Role.ToUpper()}: {msg.Content}");
                }
            }
            
            promptBuilder.AppendLine($"\nUSER: {@event.UserContent}");
            promptBuilder.AppendLine("ASSISTANT:");

            _logger.LogDebug("Unified Prompt: {Prompt}", promptBuilder.ToString());

            // Simulation of AI Call
            await Task.Delay(1500);
            
            string aiResponse = contextData != null && contextData.Messages.Count > 0 
                ? "Entendi o contexto anterior. Como posso te ajudar agora?" 
                : "Olá! Sou seu assistente IA. Como posso ajudar pela primeira vez?";

            // Add simple logic check for the prompt content if needed
            if (@event.UserContent.ToLower().Contains("preço"))
                aiResponse = "Nossos planos MCP-Ready começam em R$ 99,90.";

            await _publishEndpoint.Publish(new AIResponseIntegrationEvent(
                @event.TenantId, @event.ConversationId, aiResponse, @event.Channel, @event.ExternalId));

            _logger.LogInformation("AI Response generated with MCP context for Tenant: {TenantId}", @event.TenantId);
        }
    }
}
