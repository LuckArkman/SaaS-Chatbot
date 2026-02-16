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
}
