using System;
using SaaS.OmniChannelPlatform.Services.Tenant.Domain.Enums;

namespace SaaS.OmniChannelPlatform.Services.Tenant.Domain.Entities
{
    public class Tenant
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Identifier { get; set; } = string.Empty; // Slug or custom domain
        public TenantType Type { get; set; }
        public TenantStatus Status { get; set; } = TenantStatus.Active;
        public Guid? ParentId { get; set; } // Reseller ID for Client tenants
        public string LogoUrl { get; set; } = string.Empty;
        public string PrimaryColor { get; set; } = "#000000";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Configuration for White Label
        public string CustomDomain { get; set; } = string.Empty;
        public bool UseWhiteLabel { get; set; } = false;
    }
}
