using SaaS.OmniChannelPlatform.BuildingBlocks.Security;
using SaaS.OmniChannelPlatform.Services.Billing.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Billing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Billing.Application.Services
{
    public class BillingSubscriptionService : ISubscriptionService
    {
        private readonly BillingDbContext _context;

        public BillingSubscriptionService(BillingDbContext context)
        {
            _context = context;
        }

        public async Task<bool> IsSubscriptionActiveAsync(Guid tenantId)
        {
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId);

            return subscription != null && subscription.Status == SubscriptionStatus.Active;
        }
    }
}
