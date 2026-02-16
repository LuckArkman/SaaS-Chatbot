using System;
using System.Collections.Generic;

namespace SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities
{
    public class FlowDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public List<FlowStep> Steps { get; set; } = new();
    }

    public class FlowStep
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid FlowDefinitionId { get; set; }
        public string Content { get; set; } = string.Empty; // Message to send
        public int Order { get; set; }
        public StepType Type { get; set; } = StepType.Message;
        public string? ExpectedInput { get; set; } // For simple branching
        public Guid? NextStepId { get; set; }
    }

    public enum StepType
    {
        Message = 1,
        Input = 2,
        Handover = 3,
        AI = 4
    }

    public class FlowSession
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string ExternalId { get; set; } = string.Empty; // User phone/ID
        public Guid CurrentStepId { get; set; }
        public DateTime LastInteraction { get; set; } = DateTime.UtcNow;
        public bool IsCompleted { get; set; } = false;
        public bool IsHandedOver { get; set; } = false;
    }
}
