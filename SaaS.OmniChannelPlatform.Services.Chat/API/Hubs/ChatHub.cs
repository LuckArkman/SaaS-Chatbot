using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace SaaS.OmniChannelPlatform.Services.Chat.API.Hubs
{
    public class ChatHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var tenantId = Context.GetHttpContext()?.Request.Query["tenantId"];
            if (!string.IsNullOrEmpty(tenantId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, tenantId!);
            }
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string conversationId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
        }
    }
}
