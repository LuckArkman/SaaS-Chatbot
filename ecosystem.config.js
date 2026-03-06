module.exports = {
    apps: [
        // --- Microserviços .NET ---
        {
            name: "saas-identity",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.Identity/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.Identity.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5051",
                ConnectionStrings__DefaultConnection: "Host=127.0.0.1;Database=SaaS_OmniChannel;Username=admin;Password=password123",
                Redis__ConnectionString: "127.0.0.1:6379",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-flow-engine",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.FlowEngine/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.FlowEngine.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5124",
                MongoDb__ConnectionString: "mongodb://127.0.0.1:27017",
                Redis__ConnectionString: "127.0.0.1:6379",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-chat",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.Chat/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.Chat.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5263",
                Redis__ConnectionString: "127.0.0.1:6379",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-messaging",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.Messaging/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.Messaging.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5189",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-channel-gateway",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.ChannelGateway/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.ChannelGateway.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5032",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-billing",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.Billing/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.Billing.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5147",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-campaign",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.Services.Campaign/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.Services.Campaign.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5211",
                RabbitMQ__Host: "127.0.0.1"
            }
        },
        {
            name: "saas-admin-dashboard",
            script: "dotnet",
            args: "./SaaS.OmniChannelPlatform.AdminDashboards/bin/Release/net8.0/publish/SaaS.OmniChannelPlatform.AdminDashboards.dll",
            env: {
                ASPNETCORE_ENVIRONMENT: "Production",
                ASPNETCORE_URLS: "http://+:5050",
                ApiSettings__BaseUrl: "http://127.0.0.1:5051"
            }
        },

        // --- WhatsApp Bot (Node.js) ---
        {
            name: "saas-whatsapp-bot",
            cwd: "./SaaS.OmniChannelPlatform.Services.WhatsAppBot",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                RabbitMQ__Host: "127.0.0.1"
            }
        },

        // --- Frontend (Vue 3 via static server) ---
        {
            name: "saas-chat-ui",
            script: "serve",
            args: "-s SaaS.ChatUI/dist -l 8081",
            env: {
                VITE_API_URL: "http://126.0.0.1:5051" // Ajuste para o IP da sua VPS se for acesso externo
            }
        }
    ]
};
