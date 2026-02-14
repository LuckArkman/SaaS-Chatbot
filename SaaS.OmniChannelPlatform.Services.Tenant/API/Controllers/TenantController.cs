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

        [HttpPost]
        [Authorize(Roles = "AdminMaster")]
        public async Task<ActionResult<Domain.Entities.Tenant>> CreateTenant(Domain.Entities.Tenant tenant)
        {
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTenants), new { id = tenant.Id }, tenant);
        }
    }
}
