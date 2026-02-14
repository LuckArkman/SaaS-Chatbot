using Microsoft.AspNetCore.Http;
using System;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy
{
    public class TenantResolverMiddleware
    {
        private readonly RequestDelegate _next;

        public TenantResolverMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
        {
            // 1. Try to get from Header
            if (context.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantIdStr))
            {
                if (Guid.TryParse(tenantIdStr, out var tenantId))
                {
                    ((TenantContext)tenantContext).TenantId = tenantId;
                }
            }

            // 2. Try to get from identifier (slug in header or domain)
            if (context.Request.Headers.TryGetValue("X-Tenant-Identifier", out var identifier))
            {
                ((TenantContext)tenantContext).Identifier = identifier;
            }

            await _next(context);
        }
    }
}
