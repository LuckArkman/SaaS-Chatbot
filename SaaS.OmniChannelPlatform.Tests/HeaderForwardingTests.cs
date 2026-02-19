using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Moq;
using Moq.Protected;
using SaaS.OmniChannelPlatform.Services.Identity.Infrastructure.Handlers;
using Xunit;

namespace SaaS.OmniChannelPlatform.Tests
{
    public class HeaderForwardingTests
    {
        [Fact]
        public async Task SendAsync_HasAuthHeaderInContext_ForwardsToRequest()
        {
            // Arrange
            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            var context = new DefaultHttpContext();
            var token = "Bearer my-secret-token";
            context.Request.Headers["Authorization"] = token;
            mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(context);

            var handler = new HeaderForwardingHandler(mockHttpContextAccessor.Object);
            var innerHandler = new Mock<DelegatingHandler>();
            innerHandler.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

            handler.InnerHandler = innerHandler.Object;
            var client = new HttpClient(handler);

            // Act
            await client.GetAsync("http://example.com");

            // Assert
            innerHandler.Protected().Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.Headers.Authorization != null && 
                    req.Headers.Authorization.ToString() == token),
                ItExpr.IsAny<CancellationToken>()
            );
        }
    }
}
