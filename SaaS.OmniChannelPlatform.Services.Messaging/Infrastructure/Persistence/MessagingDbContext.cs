using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Messaging.Domain.Entities;

namespace SaaS.OmniChannelPlatform.Services.Messaging.Infrastructure.Persistence
{
    public class MessagingDbContext : DbContext
    {
        public MessagingDbContext(DbContextOptions<MessagingDbContext> options) : base(options)
        {
        }

        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Participant> Participants { get; set; }
        public DbSet<ConversationNote> ConversationNotes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Conversation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.ExternalId }).IsUnique();
            });

            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.ConversationId);
                entity.HasOne<Conversation>()
                    .WithMany(c => c.Messages)
                    .HasForeignKey(m => m.ConversationId);
            });

            modelBuilder.Entity<Participant>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.ConversationId, e.ExternalId }).IsUnique();
                entity.HasOne<Conversation>()
                    .WithMany(c => c.Participants)
                    .HasForeignKey(p => p.ConversationId);
            });
            modelBuilder.Entity<ConversationNote>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.ConversationId);
                entity.HasOne<Conversation>()
                    .WithMany(c => c.Notes)
                    .HasForeignKey(n => n.ConversationId);
            });
        }
    }
}
