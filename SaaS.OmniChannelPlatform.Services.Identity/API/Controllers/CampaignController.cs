using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "AdminMaster,Reseller")]
    public class CampaignController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public CampaignController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("Campaign");
        }

        [HttpGet]
        public async Task<IActionResult> GetCampaigns()
        {
            var response = await _httpClient.GetAsync("api/Campaign");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost]
        public async Task<IActionResult> CreateCampaign([FromBody] object campaign)
        {
            var response = await _httpClient.PostAsJsonAsync("api/Campaign", campaign);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartCampaign(string id)
        {
            var response = await _httpClient.PostAsync($"api/Campaign/{id}/start", null);
            if (response.IsSuccessStatusCode)
            {
                return Ok(new { Message = $"Campaign {id} started successfully via backend." });
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
    }
}
