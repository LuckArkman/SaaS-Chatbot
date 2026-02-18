using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "AdminMaster")]
    public class ChannelGatewayController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public ChannelGatewayController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("ChannelGateway");
        }

        [HttpGet("channels")]
        public async Task<IActionResult> GetConfiguredChannels()
        {
            var response = await _httpClient.GetAsync("api/Channels");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("whatsapp/setup")]
        public async Task<IActionResult> SetupWhatsApp([FromBody] object config)
        {
            var response = await _httpClient.PostAsJsonAsync("api/Channels/setup/whatsapp", config);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpGet("webhooks/status")]
        public IActionResult GetWebhookStatus()
        {
            // Placeholder for status monitoring
            return Ok(new { Message = "All backend webhooks monitored by Identity are active." });
        }
    }
}
