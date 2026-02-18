using System;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.Security
{
    public class AlwaysActiveSubscriptionService : ISubscriptionService
    {
        public Task<bool> IsSubscriptionActiveAsync(Guid tenantId)
        {
            return Task.FromResult(true);
        }
    }
}
