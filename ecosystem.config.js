module.exports = {
    apps: [
        {
            name: "saas-chatbot-api",
            script: "uvicorn",
            args: "src.main:app --host 0.0.0.0 --port 8000 --workers 4",
            interpreter: "python3",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PYTHONPATH: ".",
                WHATSAPP_BRIDGE_URL: "http://127.0.0.1:4000"
            }
        },
        {
            name: "saas-whatsapp-bridge",
            script: "SaaS.OmniChannelPlatform.Services.WhatsAppBot/index.js",
            instances: 1,
            autorestart: true,
            env: {
                PORT: 4000,
                WEBHOOK_URL: "http://127.0.0.1:8000/api/v1/gateway/webhook/whatsapp"
            }
        }
    ]
};
