using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.BuildingBlocks.AI.MCP;
using SaaS.OmniChannelPlatform.Services.Messaging.Infrastructure.Persistence;
using System.Linq;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Messaging.API.Controllers
{
    [ApiController]
    [Route("mcp")]
    public class McpController : ControllerBase
    {
        private readonly MessagingDbContext _context;

        public McpController(MessagingDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> HandleMcpRequest([FromBody] McpRequest request)
        {
            if (request.Method == "resources/read" && request.Params.ContainsKey("uri"))
            {
                var uri = request.Params["uri"].ToString();
                if (uri != null && uri.StartsWith("mcp://conversation/"))
                {
                    var parts = uri.Replace("mcp://conversation/", "").Split('/');
                    if (parts.Length == 2)
                    {
                        var tenantIdStr = parts[0];
                        var externalId = parts[1];

                        if (Guid.TryParse(tenantIdStr, out var tenantId))
                        {
                            var conversation = await _context.Conversations
                                .Include(c => c.Messages)
                                .Include(c => c.Participants)
                                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.ExternalId == externalId);

                            if (conversation != null)
                            {
                                var contextResource = new ConversationContextResource
                                {
                                    TenantId = tenantId,
                                    ExternalId = externalId,
                                    Messages = conversation.Messages
                                        .OrderByDescending(m => m.CreatedAt)
                                        .Take(10)
                                        .Reverse()
                                        .Select(m => {
                                            var participant = conversation.Participants.FirstOrDefault(p => p.Id == m.SenderId);
                                            return new ContextMessage
                                            {
                                                Role = (participant != null && participant.IsBot) ? "assistant" : "user",
                                                Content = m.Content,
                                                Timestamp = m.CreatedAt
                                            };
                                        }).ToList()
                                };

                                return Ok(new McpResponse { Id = request.Id, Result = contextResource });
                            }
                        }
                    }
                }
            }

            return BadRequest(new McpResponse 
            { 
                Id = request.Id, 
                Error = new McpError { Code = -32601, Message = "Method not found or invalid parameters" } 
            });
        }
    }
}
