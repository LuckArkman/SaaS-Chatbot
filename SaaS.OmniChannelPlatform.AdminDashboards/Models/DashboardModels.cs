using System;
using System.Collections.Generic;

namespace SaaS.OmniChannelPlatform.AdminDashboards.Models
{
    public class CampaignModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public double Progress { get; set; }
    }

    public class FlowModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int StepsCount => Steps.Count;
        public bool IsAIEnabled { get; set; }
        public DateTime LastModified { get; set; }
        public List<FlowStepModel> Steps { get; set; } = new();
        public string Category { get; set; } = "Assistant"; 
    }

    public class FlowStepModel
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Type { get; set; } = "Message"; 
        public string Title { get; set; } = "Novo Passo";
        public string Content { get; set; } = string.Empty;
        public double X { get; set; } = 100;
        public double Y { get; set; } = 100;
        public Guid? NextStepId { get; set; }
        public Guid? FallbackStepId { get; set; } // For branching (e.g. Model Core not found)
        public Dictionary<string, string> Metadata { get; set; } = new();
        public string NodeCategory { get; set; } = "General"; 
    }

    public class ChannelConnectionModel
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Platform { get; set; } = string.Empty; 
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = "Disconnected"; 
        public string AccountIdentifier { get; set; } = string.Empty;
        
        // Session and QR Code properties for Venom integration
        public string? SessionToken { get; set; } // Encrypted metadata or token
        public string? QRCodeBase64 { get; set; } // For visual scanning
        public bool IsSessionActive { get; set; }
        public DateTime? LastReconnected { get; set; }
    }

    public class MessageModel
    {
        public Guid Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Sender { get; set; } = string.Empty;
        public bool IsBot { get; set; }
    }

    public class ConversationModel
    {
        public Guid Id { get; set; }
        public string ContactName { get; set; } = string.Empty;
        public string LastMessage { get; set; } = string.Empty;
        public DateTime LastUpdate { get; set; }
        public string Channel { get; set; } = "WhatsApp";
    }

    public class BillingInfoModel
    {
        public string PlanName { get; set; } = "Lite";
        public decimal Price { get; set; }
        public int MessageLimit { get; set; }
        public int CurrentUsage { get; set; }
        public int DaysRemaining { get; set; }
    }
}
