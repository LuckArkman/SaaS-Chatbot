using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.Services.Billing.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Billing.Infrastructure.Persistence;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Billing.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BillingController : ControllerBase
    {
        private readonly BillingDbContext _context;
        private readonly ITenantContext _tenantContext;

        public BillingController(BillingDbContext context, ITenantContext tenantContext)
        {
            _context = context;
            _tenantContext = tenantContext;
        }

        [HttpGet("plan")]
        public async Task<IActionResult> GetCurrentPlan()
        {
            var tenantId = _tenantContext.TenantId;
            if (tenantId == null) return Unauthorized();

            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            if (subscription == null) return NotFound("No active subscription");

            var plan = await _context.Plans.FindAsync(subscription.PlanId);
            return Ok(new { Subscription = subscription, Plan = plan });
        }

        [HttpPost("subscribe/{planId}")]
        public async Task<IActionResult> Subscribe(Guid planId)
        {
            var tenantId = _tenantContext.TenantId;
            if (tenantId == null) return Unauthorized();

            var plan = await _context.Plans.FindAsync(planId);
            if (plan == null) return NotFound("Plan not found");

            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            if (subscription == null)
            {
                subscription = new Subscription
                {
                    TenantId = tenantId.Value,
                    PlanId = planId,
                    Status = SubscriptionStatus.Active
                };
                _context.Subscriptions.Add(subscription);
            }
            else
            {
                subscription.PlanId = planId;
                subscription.Status = SubscriptionStatus.Active;
            }

            await _context.SaveChangesAsync();
            return Ok(subscription);
        }

        [HttpGet("usage")]
        public async Task<IActionResult> GetUsage()
        {
            var tenantId = _tenantContext.TenantId;
            if (tenantId == null) return Unauthorized();

            var usage = await _context.UsageCounters
                .FirstOrDefaultAsync(u => u.TenantId == tenantId);

            if (usage == null)
            {
                usage = new UsageCounter { TenantId = tenantId.Value };
                _context.UsageCounters.Add(usage);
                await _context.SaveChangesAsync();
            }

            return Ok(usage);
        }
    }
}
