using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Moq.Protected;
using SaaS.OmniChannelPlatform.Services.Identity.API.Controllers;
using Xunit;

namespace SaaS.OmniChannelPlatform.Tests
{
    public class IdentityControllerTests
    {
        [Fact]
        public async Task BlockingController_GetStatus_ReturnsDataFromBackend()
        {
            // Arrange
            var mockFactory = new Mock<IHttpClientFactory>();
            var mockHandler = new Mock<DelegatingHandler>();
            var expectedResponse = new { TenantId = "uuid", Status = "Active" };

            mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = JsonContent.Create(expectedResponse)
                });

            var httpClient = new HttpClient(mockHandler.Object)
            {
                BaseAddress = new System.Uri("http://localhost")
            };

            mockFactory.Setup(f => f.CreateClient("Billing")).Returns(httpClient);

            var controller = new BlockingController(mockFactory.Object);

            // Act
            var result = await controller.GetBlockingStatus("some-tenant-id");

            // Assert
            var contentResult = Assert.IsType<ContentResult>(result);
            Assert.Contains("Active", contentResult.Content);
        }
    }
}
