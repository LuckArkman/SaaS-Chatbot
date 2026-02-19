using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public ChatController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("Chat");
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetChatHistory()
        {
            // Proxying to Chat service if it has a history endpoint
            var response = await _httpClient.GetAsync("api/Chat/history");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] object message)
        {
            var response = await _httpClient.PostAsJsonAsync("api/Chat/send", message);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpGet("agents")]
        [Authorize(Roles = "AdminMaster,Reseller")]
        public async Task<IActionResult> GetAvailableAgents()
        {
            var response = await _httpClient.GetAsync("api/Chat/agents");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
    }
}
