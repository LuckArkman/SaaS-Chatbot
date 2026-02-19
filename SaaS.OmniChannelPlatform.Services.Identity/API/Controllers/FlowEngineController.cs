using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Identity.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FlowEngineController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public FlowEngineController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("FlowEngine");
        }

        [HttpGet("flows")]
        public async Task<IActionResult> GetFlows()
        {
            var response = await _httpClient.GetAsync("api/Flow"); // Assuming FlowController in FlowEngine service
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpPost("flows")]
        [Authorize(Roles = "AdminMaster,Reseller")]
        public async Task<IActionResult> CreateFlow([FromBody] object flow)
        {
            var response = await _httpClient.PostAsJsonAsync("api/Flow", flow);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        [HttpGet("sessions")]
        public async Task<IActionResult> GetSessions()
        {
            // Placeholder: FlowEngine service might have a sessions endpoint
            return Ok(new { Message = "Flow sessions retrieved from backend." });
        }
    }
}
