module.exports = {
    apps: [
        {
            name: "saas-chatbot-api",
            script: "src/main.py",
            interpreter: "./venv/bin/python",
            instances: 1,
            autorestart: true,
            max_memory_restart: "1G",
            error_file: "./logs/api_error.log",
            out_file: "./logs/api_out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            env_production: {
                NODE_ENV: "production",
                PYTHONPATH: "."
            },
            env_development: {
                NODE_ENV: "development",
                PYTHONPATH: ".",
                watch: false
            }
        },
        {
            name: "saas-whatsapp-bridge",
            script: "index.js",
            cwd: "./SaaS.OmniChannelPlatform.Services.WhatsAppBot",
            instances: 1,
            autorestart: true,
            error_file: "../logs/bridge_error.log",
            out_file: "../logs/bridge_out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
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
