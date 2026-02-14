using System;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy
{
    public interface ITenantContext
    {
        Guid? TenantId { get; }
        string? Identifier { get; }
    }

    public class TenantContext : ITenantContext
    {
        public Guid? TenantId { get; set; }
        public string? Identifier { get; set; }
    }
}
