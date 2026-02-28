namespace SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities
{
    public class FlowDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = "Assistant";
        public bool IsActive { get; set; } = true;
        public DateTime LastModified { get; set; } = DateTime.UtcNow;
        public List<FlowStep> Steps { get; set; } = new();
    }

    public class FlowStep
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid FlowDefinitionId { get; set; }
        public string Title { get; set; } = "Novo Passo";
        public string Content { get; set; } = string.Empty; // Message to send / System Prompt
        public int Order { get; set; }
        public string Type { get; set; } = "Message"; 
        public string NodeCategory { get; set; } = "General";
        public double X { get; set; }
        public double Y { get; set; }
        public string? ExpectedInput { get; set; } // For simple branching
        public Guid? NextStepId { get; set; }
        public Guid? FallbackStepId { get; set; } // For InternalModel failed match
        public Dictionary<string, string> Metadata { get; set; } = new();
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
