using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Entities;
using SaaS.OmniChannelPlatform.Services.Messaging.Infrastructure.Persistence;

namespace SaaS.OmniChannelPlatform.Services.Messaging.API.Controllers
{
    [ApiController]
    [Route("api/conversations")]
    public class ConversationController : ControllerBase
    {
        private readonly MessagingDbContext _context;
        private readonly ILogger<ConversationController> _logger;

        public ConversationController(MessagingDbContext context, ILogger<ConversationController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ─── Notes (Internal) ─────────────────────────────────────────────────

        /// <summary>
        /// List all internal notes for a conversation.
        /// </summary>
        [HttpGet("{conversationId:guid}/notes")]
        public async Task<IActionResult> GetNotes(Guid tenantId, Guid conversationId)
        {
            var notes = await _context.ConversationNotes
                .Where(n => n.ConversationId == conversationId && n.TenantId == tenantId)
                .OrderBy(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notes);
        }

        /// <summary>
        /// Add an internal note to a conversation (never sent to the end user).
        /// </summary>
        [HttpPost("{conversationId:guid}/notes")]
        public async Task<IActionResult> AddNote(Guid conversationId, [FromBody] CreateNoteRequest request)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.TenantId == request.TenantId);

            if (conversation == null)
                return NotFound(new { message = "Conversa não encontrada." });

            var note = new ConversationNote
            {
                ConversationId = conversationId,
                TenantId = request.TenantId,
                AgentId = request.AgentId,
                AgentName = request.AgentName,
                Content = request.Content
            };

            _context.ConversationNotes.Add(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Agent {AgentName} added a note to conversation {ConversationId}",
                request.AgentName, conversationId);

            return CreatedAtAction(nameof(GetNotes), new { conversationId }, note);
        }

        /// <summary>
        /// Delete an internal note.
        /// </summary>
        [HttpDelete("{conversationId:guid}/notes/{noteId:guid}")]
        public async Task<IActionResult> DeleteNote(Guid conversationId, Guid noteId)
        {
            var note = await _context.ConversationNotes
                .FirstOrDefaultAsync(n => n.Id == noteId && n.ConversationId == conversationId);

            if (note == null) return NotFound();

            _context.ConversationNotes.Remove(note);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ─── Human Takeover ──────────────────────────────────────────────────

        /// <summary>
        /// Agent manually takes over a conversation that was escalated by the bot.
        /// Updates Conversation.AssignedAgentId so the bot will not process future messages.
        /// </summary>
        [HttpPost("{conversationId:guid}/takeover")]
        public async Task<IActionResult> Takeover(Guid conversationId, [FromBody] TakeoverRequest request)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.TenantId == request.TenantId);

            if (conversation == null)
                return NotFound(new { message = "Conversa não encontrada." });

            conversation.IsHandedOver = true;
            conversation.AssignedAgentId = request.AgentId;
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Agent {AgentId} took over conversation {ConversationId}",
                request.AgentId, conversationId);

            return Ok(new
            {
                message = "Conversa assumida com sucesso.",
                conversationId,
                assignedAgentId = request.AgentId
            });
        }

        /// <summary>
        /// Release a conversation back to the bot queue.
        /// </summary>
        [HttpPost("{conversationId:guid}/release")]
        public async Task<IActionResult> Release(Guid conversationId, [FromBody] ReleaseRequest request)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.TenantId == request.TenantId);

            if (conversation == null)
                return NotFound(new { message = "Conversa não encontrada." });

            conversation.IsHandedOver = false;
            conversation.AssignedAgentId = null;
            conversation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Conversa liberada para o bot." });
        }
    }

    // ─── Request DTOs ─────────────────────────────────────────────────────────

    public record CreateNoteRequest(
        Guid TenantId,
        Guid AgentId,
        string AgentName,
        string Content
    );

    public record TakeoverRequest(
        Guid TenantId,
        Guid AgentId
    );

    public record ReleaseRequest(
        Guid TenantId
    );
}
