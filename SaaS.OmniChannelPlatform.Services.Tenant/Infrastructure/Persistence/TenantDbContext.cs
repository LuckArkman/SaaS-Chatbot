using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Tenant.Domain.Entities;

namespace SaaS.OmniChannelPlatform.Services.Tenant.Infrastructure.Persistence
{
    public class TenantDbContext : DbContext
    {
        public TenantDbContext(DbContextOptions<TenantDbContext> options) : base(options)
        {
        }

        public DbSet<Domain.Entities.Tenant> Tenants { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Domain.Entities.Tenant>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Identifier).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            });
        }
    }
}
