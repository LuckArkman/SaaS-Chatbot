@echo off
set TENANT_ID=88888888-4444-4444-4444-121212121212
set GATEWAY_URL=http://localhost:5004/api/webhooks/whatsapp/%TENANT_ID%

echo === Simulating WhatsApp Message to OmniSaaS ===
echo Tenant: %TENANT_ID%
echo Target: %GATEWAY_URL%
echo.

curl -X POST %GATEWAY_URL% ^
-H "Content-Type: application/json" ^
-d "{\"MessageId\": \"MSG_%RANDOM%\", \"Content\": \"Ola, gostaria de suporte especializado.\", \"SenderPhone\": \"551199887766\", \"SenderName\": \"Joao Silva\"}"

echo.
echo === Simulated Message Sent! ===
echo Check service logs for:
echo 1. ChannelGateway published event
echo 2. FlowEngine routing to AI
echo 3. AI Service generating response (using MCP context)
echo 4. Chat service notifying dashboard via SignalR
echo.
pause
