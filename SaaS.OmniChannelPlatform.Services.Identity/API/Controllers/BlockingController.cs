using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "AdminMaster,Reseller")]
    public class BlockingController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public BlockingController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("Billing");
        }

        [HttpGet("status/{tenantId}")]
        public async Task<IActionResult> GetBlockingStatus(string tenantId)
        {
            var response = await _httpClient.GetAsync($"api/Billing/subscription/{tenantId}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("block")]
        [Authorize(Roles = "AdminMaster")]
        public async Task<IActionResult> BlockTenant([FromBody] string tenantId)
        {
            var response = await _httpClient.PostAsync($"api/Billing/block/{tenantId}", null);
            if (response.IsSuccessStatusCode)
            {
                return Ok(new { Message = $"Tenant {tenantId} blocked in billing system." });
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("unblock")]
        [Authorize(Roles = "AdminMaster")]
        public async Task<IActionResult> UnblockTenant([FromBody] string tenantId)
        {
            var response = await _httpClient.PostAsync($"api/Billing/unblock/{tenantId}", null);
            if (response.IsSuccessStatusCode)
            {
                return Ok(new { Message = $"Tenant {tenantId} unblocked in billing system." });
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
    }
}
