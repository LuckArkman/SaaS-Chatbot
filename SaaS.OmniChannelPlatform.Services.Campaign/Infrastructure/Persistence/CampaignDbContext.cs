using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Campaign.Domain.Entities;

namespace SaaS.OmniChannelPlatform.Services.Campaign.Infrastructure.Persistence
{
    public class CampaignDbContext : DbContext
    {
        public CampaignDbContext(DbContextOptions<CampaignDbContext> options) : base(options)
        {
        }

        public DbSet<Domain.Entities.Campaign> Campaigns { get; set; }
        public DbSet<Domain.Entities.CampaignReceiver> Receivers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Domain.Entities.Campaign>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId);
            });

            modelBuilder.Entity<Domain.Entities.CampaignReceiver>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CampaignId);
            });
        }
    }
}
