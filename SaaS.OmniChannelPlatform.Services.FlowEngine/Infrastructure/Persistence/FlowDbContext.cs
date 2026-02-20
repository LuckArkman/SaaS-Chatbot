using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.FlowEngine.Domain.Entities;

namespace SaaS.OmniChannelPlatform.Services.FlowEngine.Infrastructure.Persistence
{
    public class FlowDbContext : DbContext
    {
        public FlowDbContext(DbContextOptions<FlowDbContext> options) : base(options)
        {
        }

        public DbSet<FlowDefinition> Flows { get; set; }
        public DbSet<FlowStep> Steps { get; set; }
        public DbSet<FlowSession> Sessions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<FlowStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Metadata)
                    .HasConversion(
                        v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json. JsonSerializerOptions?)null),
                        v => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new Dictionary<string, string>());
            });

            modelBuilder.Entity<FlowDefinition>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasMany(e => e.Steps)
                    .WithOne()
                    .HasForeignKey(s => s.FlowDefinitionId);
            });

            modelBuilder.Entity<FlowSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.ExternalId });
            });
        }
    }
}
