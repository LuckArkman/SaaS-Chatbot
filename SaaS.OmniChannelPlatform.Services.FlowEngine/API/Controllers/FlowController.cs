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
            // Note: In production, filter by TenantId from ITenantContext
            return await _context.Flows.Include(f => f.Steps).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FlowDefinition>> GetFlow(Guid id)
        {
            var flow = await _context.Flows.Include(f => f.Steps).FirstOrDefaultAsync(f => f.Id == id);
            if (flow == null) return NotFound();
            return flow;
        }

        [HttpPost]
        public async Task<ActionResult<FlowDefinition>> CreateFlow(FlowDefinition flow)
        {
            var existing = await _context.Flows.Include(f => f.Steps).FirstOrDefaultAsync(f => f.Id == flow.Id);
            if (existing != null)
            {
                // Update existing
                _context.Entry(existing).CurrentValues.SetValues(flow);
                _context.Steps.RemoveRange(existing.Steps);
                existing.Steps = flow.Steps;
                existing.LastModified = DateTime.UtcNow;
            }
            else
            {
                flow.LastModified = DateTime.UtcNow;
                _context.Flows.Add(flow);
            }

            await _context.SaveChangesAsync();
            return Ok(flow);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFlow(Guid id)
        {
            var flow = await _context.Flows.FindAsync(id);
            if (flow == null) return NotFound();
            _context.Flows.Remove(flow);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
