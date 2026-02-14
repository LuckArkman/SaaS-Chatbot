using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.ChannelGateway.Application.Interfaces
{
    public interface IChannelProvider
    {
        string ChannelName { get; }
        Task SendMessageAsync(string to, string content, object? metadata = null);
    }
}
