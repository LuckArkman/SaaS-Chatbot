module.exports = {
    apps: [
        {
            name: "saas-chatbot-api",
            script: "uvicorn",
            args: "src.main:app --host 0.0.0.0 --port 8000 --workers 4",
            interpreter: "python3",
            instances: 1,
            autorestart: true,
            max_memory_restart: "1G",
            env_production: {
                NODE_ENV: "production",
                PYTHONPATH: ".",
                # As variáveis serão lidas do arquivo.env ou do sistema
            },
            env_development: {
                NODE_ENV: "development",
                PYTHONPATH: ".",
                watch: true,
                # Sobrescreve args para modo debug(reload e worker único)
                args: "src.main:app --host 0.0.0.0 --port 8000 --reload"
            }
        },
        {
            name: "saas-whatsapp-bridge",
            script: "SaaS.OmniChannelPlatform.Services.WhatsAppBot/index.js",
            instances: 1,
            autorestart: true,
            env: {
                NODE_ENV: "production",
                PORT: 4000
            },
            env_development: {
                NODE_ENV: "development",
                PORT: 4000
            }
        }
    ]
};
