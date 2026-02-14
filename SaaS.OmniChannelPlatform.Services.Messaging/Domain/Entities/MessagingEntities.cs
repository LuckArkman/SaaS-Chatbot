using System;
using System.Collections.Generic;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Enums;

namespace SaaS.OmniChannelPlatform.Services.Messaging.Domain.Entities
{
    public class Conversation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string ExternalId { get; set; } = string.Empty; // ID from WhatsApp/Telegram
        public string Channel { get; set; } = string.Empty;
        public ConversationStatus Status { get; set; } = ConversationStatus.Open;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public List<Participant> Participants { get; set; } = new();
        public List<Message> Messages { get; set; } = new();
    }

    public class Message
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ConversationId { get; set; }
        public Guid TenantId { get; set; }
        public Guid? SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
        public MessageType Type { get; set; } = MessageType.Text;
        public MessageStatus Status { get; set; } = MessageStatus.Sending;
        public string ExternalId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Metadata { get; set; } = string.Empty; // JSON string for extra info
    }

    public class Participant
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ConversationId { get; set; }
        public Guid? UserId { get; set; } // Internal User ID if available
        public string ExternalId { get; set; } = string.Empty; // Phone number or Channel ID
        public string Name { get; set; } = string.Empty;
        public bool IsBot { get; set; } = false;
    }
}
