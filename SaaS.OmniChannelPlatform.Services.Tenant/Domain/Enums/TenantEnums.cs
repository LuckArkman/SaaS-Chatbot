using System;

namespace SaaS.OmniChannelPlatform.Services.Tenant.Domain.Enums
{
    public enum TenantType
    {
        AdminMaster = 1,
        Reseller = 2,
        Client = 3
    }

    public enum TenantStatus
    {
        Active = 1,
        Suspended = 2,
        Blocked = 3
    }
}
