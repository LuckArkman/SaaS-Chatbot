using System;

namespace SaaS.OmniChannelPlatform.Services.Messaging.Domain.Enums
{
    public enum MessageType
    {
        None = 0,
        Text = 1,
        Image = 2,
        Video = 3,
        Audio = 4,
        Document = 5,
        Location = 6,
        Contact = 7,
        Template = 8
    }

    public enum MessageStatus
    {
        None = 0,
        Sending = 1,
        Sent = 2,
        Delivered = 3,
        Read = 4,
        Failed = 5
    }

    public enum ConversationStatus
    {
        None = 0,
        Open = 1,
        InService = 2,
        Waiting = 3,
        Closed = 4
    }
}
