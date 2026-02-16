using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Tenant.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Tenant.Infrastructure.Persistence;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Tenant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "AdminMaster,Reseller")]
    public class TenantController : ControllerBase
    {
        private readonly TenantDbContext _context;

        public TenantController(TenantDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Domain.Entities.Tenant>>> GetTenants()
        {
            return await _context.Tenants.ToListAsync();
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<Domain.Entities.Tenant>> GetMyTenant([FromHeader(Name = "X-Tenant-ID")] Guid tenantId)
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null) return NotFound();
            return Ok(tenant);
        }

        [HttpPost]
        [Authorize(Roles = "AdminMaster")]
        public async Task<ActionResult<Domain.Entities.Tenant>> CreateTenant(Domain.Entities.Tenant tenant)
        {
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTenants), new { id = tenant.Id }, tenant);
        }

        [HttpPut("white-label")]
        [Authorize(Roles = "AdminMaster,Reseller")]
        public async Task<IActionResult> UpdateWhiteLabel([FromBody] WhiteLabelUpdateRequest request, [FromHeader(Name = "X-Tenant-ID")] Guid tenantId)
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null) return NotFound();

            tenant.LogoUrl = request.LogoUrl;
            tenant.PrimaryColor = request.PrimaryColor;
            tenant.UseWhiteLabel = true;
            tenant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(tenant);
        }
    }

    public record WhiteLabelUpdateRequest(string LogoUrl, string PrimaryColor);
}
