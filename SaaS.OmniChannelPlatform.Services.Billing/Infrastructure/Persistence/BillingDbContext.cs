using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Billing.Domain.Entities;

namespace SaaS.OmniChannelPlatform.Services.Billing.Infrastructure.Persistence
{
    public class BillingDbContext : DbContext
    {
        public BillingDbContext(DbContextOptions<BillingDbContext> options) : base(options)
        {
        }

        public DbSet<Plan> Plans { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<UsageCounter> UsageCounters { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Plan>(entity =>
            {
                entity.HasKey(e => e.Id);
            });

            modelBuilder.Entity<Subscription>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId).IsUnique();
            });

            modelBuilder.Entity<UsageCounter>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId).IsUnique();
            });
        }
    }
}
