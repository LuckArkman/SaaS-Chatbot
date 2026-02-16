using System;

namespace SaaS.OmniChannelPlatform.Services.Billing.Domain.Entities
{
    public class Plan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int MessageLimit { get; set; }
        public int ActiveChatsLimit { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class Subscription
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public Guid PlanId { get; set; }
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }
        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    }

    public enum SubscriptionStatus
    {
        Active = 1,
        PastDue = 2,
        Canceled = 3,
        Trialing = 4
    }

    public class UsageCounter
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public int CurrentMonthMessages { get; set; }
        public DateTime LastResetDate { get; set; } = DateTime.UtcNow;
    }
}
