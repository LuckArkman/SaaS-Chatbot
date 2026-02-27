using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SaaS.OmniChannelPlatform.Services.AI.Infrastructure.AI
{
    public interface IAIService
    {
        Task<string> GetCompletionAsync(string prompt, string? systemPrompt = null);
    }

    public class GeminiAIService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ILogger<GeminiAIService> _logger;

        public GeminiAIService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiAIService> logger)
        {
            _httpClient = httpClient;
            _apiKey = configuration["AI:ApiKey"] ?? string.Empty;
            _logger = logger;
        }

        public async Task<string> GetCompletionAsync(string prompt, string? systemPrompt = null)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Gemini API Key is missing. Falling back to mock response.");
                return "Configuração de IA pendente (ApiKey ausente).";
            }

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = $"{(string.IsNullOrEmpty(systemPrompt) ? "" : systemPrompt + "\n\n")}User: {prompt}" }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    maxOutputTokens = 800
                }
            };

            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
                return result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text 
                       ?? "Não consegui processar sua mensagem no momento.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API");
                return "Desculpe, tive um problema ao processar sua solicitação.";
            }
        }
    }

    // Response models for Gemini API
    public class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; set; }
    }

    public class Candidate
    {
        [JsonPropertyName("content")]
        public Content? Content { get; set; }
    }

    public class Content
    {
        [JsonPropertyName("parts")]
        public List<Part>? Parts { get; set; }
    }

    public class Part
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
