using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;

namespace SaaS.OmniChannelPlatform.BuildingBlocks.Security
{
    public interface ISubscriptionService
    {
        Task<bool> IsSubscriptionActiveAsync(Guid tenantId);
    }

    public class SubscriptionCheckMiddleware
    {
        private readonly RequestDelegate _next;

        public SubscriptionCheckMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, ISubscriptionService subscriptionService)
        {
            // Allowed paths (e.g., login, health, or billing itself)
            if (context.Request.Path.Value!.Contains("/api/auth") || 
                context.Request.Path.Value!.Contains("/api/Billing") ||
                context.Request.Path.Value!.Contains("/swagger"))
            {
                await _next(context);
                return;
            }

            if (tenantContext.TenantId.HasValue)
            {
                var isActive = await subscriptionService.IsSubscriptionActiveAsync(tenantContext.TenantId.Value);
                if (!isActive)
                {
                    context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
                    await context.Response.WriteAsJsonAsync(new { Message = "Sua conta está bloqueada por falta de pagamento ou assinatura inativa." });
                    return;
                }
            }

            await _next(context);
        }
    }
}
