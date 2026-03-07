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
                PYTHONPATH: "."
            }
        },
        {
            name: "saas-whatsapp-bridge",
            script: "SaaS.OmniChannelPlatform.Services.WhatsAppBot/index.js", // Bridge de WhatsApp Node.js
            instances: 1,
            autorestart: true
        }
    ]
};
