using MassTransit;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Enums;
using SaaS.OmniChannelPlatform.Services.Messaging.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SaaS.OmniChannelPlatform.Services.Messaging.Application.Consumers
{
    public class MessageReceivedConsumer : IConsumer<MessageReceivedIntegrationEvent>
    {
        private readonly MessagingDbContext _context;
        private readonly ILogger<MessageReceivedConsumer> _logger;

        public MessageReceivedConsumer(MessagingDbContext context, ILogger<MessageReceivedConsumer> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<MessageReceivedIntegrationEvent> context)
        {
            var @event = context.Message;
            _logger.LogInformation("Processing MessageReceived event for Tenant: {TenantId}, Channel: {Channel}", @event.TenantId, @event.Channel);

            // 1. Find or create conversation
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.ExternalId == @event.SenderExternalId && c.TenantId == @event.TenantId && c.Channel == @event.Channel);

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    TenantId = @event.TenantId,
                    ExternalId = @event.SenderExternalId,
                    Channel = @event.Channel,
                    Status = ConversationStatus.Open,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add participant (Customer)
                conversation.Participants.Add(new Participant
                {
                    ConversationId = conversation.Id,
                    ExternalId = @event.SenderExternalId,
                    Name = @event.SenderName,
                    IsBot = false
                });

                _context.Conversations.Add(conversation);
            }
            else
            {
                conversation.UpdatedAt = DateTime.UtcNow;
            }

            // 2. Save Message
            var message = new Message
            {
                ConversationId = conversation.Id,
                TenantId = @event.TenantId,
                ExternalId = @event.ExternalId,
                Content = @event.Content,
                Type = MessageType.Text,
                Status = MessageStatus.Delivered,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Message from {SenderName} saved to conversation {ConversationId}", @event.SenderName, conversation.Id);
        }
    }
}
