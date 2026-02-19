using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChannelsController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetChannels()
        {
            return Ok(new List<object> 
            { 
                new { Name = "WhatsApp Meta", Status = "Active", Provider = "Meta" },
                new { Name = "SMS", Status = "Inactive", Provider = "Twilio" }
            });
        }

        [HttpPost("setup/whatsapp")]
        public IActionResult SetupWhatsApp([FromBody] object config)
        {
            return Ok(new { Message = "WhatsApp configuration updated.", Config = config });
        }
    }
}
