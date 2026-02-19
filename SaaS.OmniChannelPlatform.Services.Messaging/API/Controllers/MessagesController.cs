using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.BuildingBlocks.EventBus.Events;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Enums;
using SaaS.OmniChannelPlatform.Services.Messaging.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Messaging.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly MessagingDbContext _context;
        private readonly ITenantContext _tenantContext;
        private readonly IPublishEndpoint _publishEndpoint;

        public MessagesController(
            MessagingDbContext context,
            ITenantContext tenantContext,
            IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _tenantContext = tenantContext;
            _publishEndpoint = publishEndpoint;
        }

        [HttpGet("{conversationId}")]
        public async Task<ActionResult<IEnumerable<Message>>> GetMessages(Guid conversationId)
        {
            return await _context.Messages
                .Where(m => m.ConversationId == conversationId && m.TenantId == _tenantContext.TenantId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            if (_tenantContext.TenantId == null) return Unauthorized();

            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId && c.TenantId == _tenantContext.TenantId);

            if (conversation == null) return NotFound("Conversation not found");

            var recipient = conversation.Participants.FirstOrDefault(p => !p.IsBot); // Simplificação
            if (recipient == null) return BadRequest("Recipient not found");

            var message = new Message
            {
                ConversationId = conversation.Id,
                TenantId = _tenantContext.TenantId.Value,
                Content = request.Content,
                Type = MessageType.Text,
                Status = MessageStatus.Sending,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            // Publish integration event to trigger actually sending through Channel Gateway
            await _publishEndpoint.Publish(new SendMessageIntegrationEvent(
                _tenantContext.TenantId.Value,
                conversation.Id,
                request.Content,
                recipient.ExternalId,
                conversation.Channel
            ));

            return Ok(message);
        }

        [HttpGet("conversations")]
        public async Task<ActionResult<IEnumerable<Conversation>>> GetConversations()
        {
            return await _context.Conversations
                .Where(c => c.TenantId == _tenantContext.TenantId)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "AdminMaster")]
        public async Task<IActionResult> DeleteConversation(Guid id)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == _tenantContext.TenantId);

            if (conversation == null) return NotFound();

            _context.Conversations.Remove(conversation);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public record SendMessageRequest(Guid ConversationId, string Content);
}
