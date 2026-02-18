using Microsoft.AspNetCore.Http;
using Moq;
using SaaS.OmniChannelPlatform.BuildingBlocks.MultiTenancy;
using SaaS.OmniChannelPlatform.BuildingBlocks.Security;
using Xunit;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;

namespace SaaS.OmniChannelPlatform.Tests
{
    public class SubscriptionCheckTests
    {
        [Fact]
        public async Task InvokeAsync_BlockedTenant_ReturnsPaymentRequired()
        {
            // Arrange
            var next = new Mock<RequestDelegate>();
            var middleware = new SubscriptionCheckMiddleware(next.Object);
            
            var context = new DefaultHttpContext();
            context.Request.Path = "/api/Messaging/conversations";
            context.Response.Body = new MemoryStream();

            var tenantContext = new Mock<ITenantContext>();
            var tenantId = Guid.NewGuid();
            tenantContext.Setup(t => t.TenantId).Returns(tenantId);

            var subscriptionService = new Mock<ISubscriptionService>();
            subscriptionService.Setup(s => s.IsSubscriptionActiveAsync(tenantId))
                .ReturnsAsync(false); // Simula tenant bloqueado

            // Act
            await middleware.InvokeAsync(context, tenantContext.Object, subscriptionService.Object);

            // Assert
            Assert.Equal(StatusCodes.Status402PaymentRequired, context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_ActiveTenant_CallsNextDelegate()
        {
            // Arrange
            var nextCalled = false;
            RequestDelegate next = (ctx) => {
                nextCalled = true;
                return Task.CompletedTask;
            };
            var middleware = new SubscriptionCheckMiddleware(next);
            
            var context = new DefaultHttpContext();
            context.Request.Path = "/api/Messaging/conversations";

            var tenantContext = new Mock<ITenantContext>();
            var tenantId = Guid.NewGuid();
            tenantContext.Setup(t => t.TenantId).Returns(tenantId);

            var subscriptionService = new Mock<ISubscriptionService>();
            subscriptionService.Setup(s => s.IsSubscriptionActiveAsync(tenantId))
                .ReturnsAsync(true); // Simula tenant ativo

            // Act
            await middleware.InvokeAsync(context, tenantContext.Object, subscriptionService.Object);

            // Assert
            Assert.True(nextCalled);
        }

        [Fact]
        public async Task InvokeAsync_AllowedPath_BypassesCheck()
        {
            // Arrange
            var nextCalled = false;
            RequestDelegate next = (ctx) => {
                nextCalled = true;
                return Task.CompletedTask;
            };
            var middleware = new SubscriptionCheckMiddleware(next);
            
            var context = new DefaultHttpContext();
            context.Request.Path = "/api/auth/login";

            var tenantContext = new Mock<ITenantContext>();
            var subscriptionService = new Mock<ISubscriptionService>();

            // Act
            await middleware.InvokeAsync(context, tenantContext.Object, subscriptionService.Object);

            // Assert
            Assert.True(nextCalled);
            subscriptionService.Verify(s => s.IsSubscriptionActiveAsync(It.IsAny<Guid>()), Times.Never);
        }
    }
}
