using MassTransit;
using Microsoft.AspNetCore.Mvc;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.API.Controllers
{
    [ApiController]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IPublishEndpoint _publishEndpoint;

        public WebhooksController(IPublishEndpoint publishEndpoint)
        {
            _publishEndpoint = publishEndpoint;
        }

        [HttpPost("whatsapp/{tenantId}")]
        public async Task<IActionResult> WhatsAppWebhook(Guid tenantId, [FromBody] WhatsAppIncomingMessage payload)
        {
            // Simulação de recebimento de mensagem
            // Em produção, aqui validaríamos a assinatura do webhook (secret)
            
            await _publishEndpoint.Publish(new MessageReceivedIntegrationEvent(
                tenantId,
                payload.MessageId,
                "WhatsApp",
                payload.Content,
                payload.SenderName,
                payload.SenderPhone
            ));

            return Ok();
        }
    }

    public record WhatsAppIncomingMessage(string MessageId, string Content, string SenderPhone, string SenderName);
}
