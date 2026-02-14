using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SaaS.OmniChannelPlatform.Services.Identity.Domain.Entities;
using System;

namespace SaaS.OmniChannelPlatform.Services.Identity.Infrastructure.Persistence
{
    public class IdentityContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public IdentityContext(DbContextOptions<IdentityContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            // Customizations for Identity tables
            builder.Entity<ApplicationUser>(entity => {
                entity.ToTable("Users");
            });

            builder.Entity<ApplicationRole>(entity => {
                entity.ToTable("Roles");
            });
        }
    }
}
