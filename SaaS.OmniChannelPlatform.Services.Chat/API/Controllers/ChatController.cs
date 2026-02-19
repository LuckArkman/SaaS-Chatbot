using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Chat.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        [HttpGet("history")]
        public IActionResult GetHistory()
        {
            // Em um cenário real, buscaríamos no banco de dados de histórico de mensagens (Messaging)
            return Ok(new List<object> { new { Message = "Histórico de chat simulado." } });
        }

        [HttpGet("agents")]
        public IActionResult GetAgents()
        {
            return Ok(new List<object> { new { Name = "Agente 01", Status = "Online" } });
        }

        [HttpPost("send")]
        public IActionResult SendMessage([FromBody] object message)
        {
            return Ok(new { Status = "Message queued for delivery", Data = message });
        }
    }
}
