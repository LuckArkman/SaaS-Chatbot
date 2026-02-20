using System;
using System.Collections.Generic;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.AI.MCP
{
    // Basic Model Context Protocol (MCP) data structures
    public class McpRequest
    {
        public string Method { get; set; } = string.Empty;
        public Dictionary<string, object> Params { get; set; } = new();
        public string Id { get; set; } = Guid.NewGuid().ToString();
    }

    public class McpResponse
    {
        public object? Result { get; set; }
        public McpError? Error { get; set; }
        public string Id { get; set; } = string.Empty;
    }

    public class McpError
    {
        public int Code { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // Specific MCP Resource for Conversation Context
    public class ConversationContextResource
    {
        public Guid TenantId { get; set; }
        public string ExternalId { get; set; } = string.Empty;
        public List<ContextMessage> Messages { get; set; } = new();
    }

    public class ContextMessage
    {
        public string Role { get; set; } = string.Empty; // "user" or "assistant"
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
