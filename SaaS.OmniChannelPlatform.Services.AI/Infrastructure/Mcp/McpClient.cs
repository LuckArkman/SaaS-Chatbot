using SaaS.OmniChannelPlatform.BuildingBlocks.AI.MCP;

namespace SaaS.OmniChannelPlatform.Services.AI.Infrastructure.Mcp
{
    public class McpClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _messagingServiceUrl;

        public McpClient(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _messagingServiceUrl = configuration["ServiceUrls:Messaging"] ?? "http://localhost:5005";
        }

        public async Task<ConversationContextResource?> GetConversationContextAsync(Guid tenantId, string externalId)
        {
            var request = new McpRequest
            {
                Method = "resources/read",
                Params = new Dictionary<string, object>
                {
                    { "uri", $"mcp://conversation/{tenantId}/{externalId}" }
                }
            };

            var response = await _httpClient.PostAsJsonAsync($"{_messagingServiceUrl}/mcp", request);
            if (response.IsSuccessStatusCode)
            {
                var mcpResponse = await response.Content.ReadFromJsonAsync<McpResponse>();
                if (mcpResponse?.Result != null)
                {
                    // Deserialize the result back to ConversationContextResource
                    var json = System.Text.Json.JsonSerializer.Serialize(mcpResponse.Result);
                    return System.Text.Json.JsonSerializer.Deserialize<ConversationContextResource>(json);
                }
            }

            return null;
        }
    }
}
