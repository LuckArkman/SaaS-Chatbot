using SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.Infrastructure.Providers
{
    public class WhatsAppMetaProvider : IChannelProvider
    {
        private readonly ILogger<WhatsAppMetaProvider> _logger;

        public WhatsAppMetaProvider(ILogger<WhatsAppMetaProvider> logger)
        {
            _logger = logger;
        }

        public string ChannelName => "WhatsApp";

        public async Task SendMessageAsync(string to, string content, object? metadata = null)
        {
            // Simulate API Call to Meta
            _logger.LogInformation("Sending WhatsApp message to {To}: {Content}", to, content);
            
            // In a real scenario, we would use HttpClient here
            await Task.Delay(100); 
            
            _logger.LogInformation("WhatsApp message sent successfully to {To}", to);
        }
    }
}
