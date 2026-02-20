using System;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events
{
    public interface IntegrationEvent
    {
        Guid Id { get; }
        DateTime CreationDate { get; }
    }

    public record MessageReceivedIntegrationEvent(
        Guid TenantId,
        string ExternalId,
        string Channel,
        string Content,
        string SenderName,
        string SenderExternalId
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }

    public record SendMessageIntegrationEvent(
        Guid TenantId,
        Guid ConversationId,
        string Content,
        string RecipientExternalId,
        string Channel
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }

    public record ProcessAIRequestIntegrationEvent(
        Guid TenantId,
        Guid ConversationId,
        string UserContent,
        string Channel,
        string ExternalId,
        string? SystemPrompt = null
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }

    public record AIResponseIntegrationEvent(
        Guid TenantId,
        Guid ConversationId,
        string AIContent,
        string Channel,
        string ExternalId
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Published when the bot hands over a conversation to a human agent.
    /// The Chat service listens to this to notify the dashboard via SignalR.
    /// </summary>
    public record HandoverIntegrationEvent(
        Guid TenantId,
        string ExternalId,
        string Channel,
        string ContactName,
        string LastBotMessage
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Published when a message status changes (Sent → Delivered → Read).
    /// </summary>
    public record MessageStatusChangedIntegrationEvent(
        Guid TenantId,
        Guid MessageId,
        string ExternalMessageId,
        string Status // "Sent", "Delivered", "Read", "Failed"
    ) : IntegrationEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime CreationDate { get; init; } = DateTime.UtcNow;
    }
}
