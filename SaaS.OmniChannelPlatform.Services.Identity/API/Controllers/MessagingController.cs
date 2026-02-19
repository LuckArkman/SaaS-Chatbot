using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagingController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public MessagingController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("Messaging");
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var response = await _httpClient.GetAsync("api/Messages/conversations");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpGet("messages/{conversationId}")]
        public async Task<IActionResult> GetMessages(string conversationId)
        {
            var response = await _httpClient.GetAsync($"api/Messages/{conversationId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpDelete("conversations/{id}")]
        [Authorize(Roles = "AdminMaster")]
        public async Task<IActionResult> DeleteConversation(string id)
        {
            var response = await _httpClient.DeleteAsync($"api/Messages/{id}");
            if (response.IsSuccessStatusCode)
            {
                return NoContent();
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
    }
}
