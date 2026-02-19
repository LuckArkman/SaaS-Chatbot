using System.Net.Http.Json;
using SaaS.OmniChannelPlatform.AdminDashboards.Models;

namespace SaaS.OmniChannelPlatform.AdminDashboards.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient;

        public ApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        // Campaigns
        public async Task<List<CampaignModel>> GetCampaignsAsync()
        {
            try 
            {
                return await _httpClient.GetFromJsonAsync<List<CampaignModel>>("api/Campaign") ?? new();
            }
            catch
            {
                // Fallback to mock data if API is not reachable for demo
                return new List<CampaignModel>
                {
                    new() { Id = Guid.NewGuid(), Name = "Promoção de Verão", Status = "Running", Progress = 65 },
                    new() { Id = Guid.NewGuid(), Name = "Informativo Mensal", Status = "Scheduled", Progress = 0 }
                };
            }
        }

        // Flows
        public async Task<List<FlowModel>> GetFlowsAsync()
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<List<FlowModel>>("api/FlowEngine/flows") ?? new();
            }
            catch
            {
                return new List<FlowModel>
                {
                    new() 
                    { 
                        Id = Guid.NewGuid(), 
                        Name = "Boas Vindas", 
                        IsActive = true, 
                        IsAIEnabled = true, 
                        LastModified = DateTime.Now.AddHours(-2),
                        Steps = new List<FlowStepModel> { new(), new(), new() }
                    }
                };
            }
        }

        // Messaging
        public async Task<List<ConversationModel>> GetConversationsAsync()
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<List<ConversationModel>>("api/Messaging/conversations") ?? new();
            }
            catch
            {
                return new List<ConversationModel>
                {
                    new() { Id = Guid.NewGuid(), ContactName = "+55 11 99876-5432", LastMessage = "Gostaria de saber o preço...", LastUpdate = DateTime.Now, Channel = "WhatsApp" },
                    new() { Id = Guid.NewGuid(), ContactName = "Maria Oliveira", LastMessage = "Obrigada!", LastUpdate = DateTime.Now.AddMinutes(-120), Channel = "WhatsApp" }
                };
            }
        }

        // Billing
        public async Task<BillingInfoModel> GetBillingInfoAsync(Guid tenantId)
        {
            try
            {
                // Proxy through Identity to Billing
                return await _httpClient.GetFromJsonAsync<BillingInfoModel>($"api/Blocking/status/{tenantId}") ?? new();
            }
            catch
            {
                return new BillingInfoModel { PlanName = "Lite", Price = 99.90m, MessageLimit = 1000, CurrentUsage = 750, DaysRemaining = 12 };
            }
        }

        // Channels
        public async Task<List<ChannelConnectionModel>> GetChannelsAsync()
        {
            try
            {
                var channels = await _httpClient.GetFromJsonAsync<List<ChannelConnectionModel>>("api/Messaging/channels") ?? new();
                return channels;
            }
            catch
            {
                // Return persistent mock list for demo
                return _mockConnections;
            }
        }

        private static List<ChannelConnectionModel> _mockConnections = new()
        {
            new() { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Platform = "WhatsApp", Name = "Conta Principal", Status = "Disconnected", AccountIdentifier = "Não Vinculado" },
            new() { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Platform = "Telegram", Name = "@Bot_Novo", Status = "Pending", AccountIdentifier = "Aguardando Token" }
        };

        public async Task RefreshChannelQRAsync(ChannelConnectionModel conn)
        {
            if (conn.Platform != "WhatsApp") return;

            try
            {
                using var client = new HttpClient();
                // Call the Venom Bot service directly (assuming localhost mapping for dev)
                var response = await client.GetFromJsonAsync<VenomQrResponse>($"http://localhost:4000/qr/{conn.Id}");
                if (response != null && !string.IsNullOrEmpty(response.Qr))
                {
                    conn.QRCodeBase64 = response.Qr;
                    conn.Status = "Pending";
                }
            }
            catch { /* Ignore failures in mock mode */ }
        }

        private class VenomQrResponse { public string Qr { get; set; } = string.Empty; public string Status { get; set; } = string.Empty; }
    }
}
