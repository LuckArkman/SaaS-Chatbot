#!/bin/bash

echo "🚀 Iniciando Build de todos os serviços..."

# 1. Build de todos os serviços .NET
SERVICES=(
    "SaaS.OmniChannelPlatform.Services.Identity"
    "SaaS.OmniChannelPlatform.Services.FlowEngine"
    "SaaS.OmniChannelPlatform.Services.Chat"
    "SaaS.OmniChannelPlatform.Services.Messaging"
    "SaaS.OmniChannelPlatform.Services.ChannelGateway"
    "SaaS.OmniChannelPlatform.Services.Billing"
    "SaaS.OmniChannelPlatform.Services.Campaign"
    "SaaS.OmniChannelPlatform.AdminDashboards"
)

for SERVICE in "${SERVICES[@]}"
do
    echo "📦 Compilando $SERVICE..."
    dotnet publish "$SERVICE/$SERVICE.csproj" -c Release
done

# 2. Build do Bot WhatsApp (Node.js)
echo "🤖 Instalando dependências do WhatsApp Bot..."
cd SaaS.OmniChannelPlatform.Services.WhatsAppBot
npm install
cd ..

# 3. Build do Frontend (Vue 3)
echo "🎨 Compilando Frontend (ChatUI)..."
cd SaaS.ChatUI
npm install
npm run build
cd ..

# 4. Sobendo com PM2
echo "⚙️ Iniciando processos no PM2..."
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "✅ Pronto! Use 'pm2 monit' para ver o status dos serviços."
