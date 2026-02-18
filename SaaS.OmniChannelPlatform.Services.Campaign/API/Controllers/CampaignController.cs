using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.Services.Campaign.Infrastructure.Persistence;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace SaaS.OmniChannelPlatform.Services.Campaign.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "AdminMaster,Reseller,Client")]
    public class CampaignController : ControllerBase
    {
        private readonly CampaignDbContext _context;
        private readonly ITenantContext _tenantContext;

        public CampaignController(CampaignDbContext context, ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Domain.Entities.Campaign>>> GetCampaigns()
        {
            var tenantId = _tenantContext.TenantId;
            return await _context.Campaigns
                .Where(c => c.TenantId == tenantId)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Domain.Entities.Campaign>> CreateCampaign(Domain.Entities.Campaign campaign)
        {
            campaign.TenantId = _tenantContext.TenantId ?? throw new System.UnauthorizedAccessException();
            _context.Campaigns.Add(campaign);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCampaigns), new { id = campaign.Id }, campaign);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Domain.Entities.Campaign>> GetCampaign(Guid id)
        {
            var campaign = await _context.Campaigns
                .Include(c => c.Receivers)
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == _tenantContext.TenantId);

            if (campaign == null) return NotFound();
            return campaign;
        }
    }
}
