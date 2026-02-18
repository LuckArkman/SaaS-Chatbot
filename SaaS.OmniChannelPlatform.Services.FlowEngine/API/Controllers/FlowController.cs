using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Infrastructure.Persistence;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.FlowEngine.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlowController : ControllerBase
    {
        private readonly FlowDbContext _context;

        public FlowController(FlowDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FlowDefinition>>> GetFlows()
        {
            return await _context.Flows.Include(f => f.Steps).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<FlowDefinition>> CreateFlow(FlowDefinition flow)
        {
            _context.Flows.Add(flow);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetFlows), new { id = flow.Id }, flow);
        }
    }
}
