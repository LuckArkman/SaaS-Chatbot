using System;
using System.Collections.Generic;

namespace SaaS.OmniChannelPlatform.Services.Campaign.Domain.Entities
{
    public class Campaign
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty; // WhatsApp, SMS, etc.
        public CampaignStatus Status { get; set; } = CampaignStatus.Draft;
        public DateTime ScheduledAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<CampaignReceiver> Receivers { get; set; } = new();
    }

    public class CampaignReceiver
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CampaignId { get; set; }
        public string ExternalId { get; set; } = string.Empty; // Phone number
        public bool Sent { get; set; } = false;
        public DateTime? SentAt { get; set; }
    }

    public enum CampaignStatus
    {
        Draft = 1,
        Scheduled = 2,
        Processing = 3,
        Completed = 4,
        Failed = 5
    }
}
