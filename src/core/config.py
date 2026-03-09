import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "SaaS Chatbot API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_ME")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "admin")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password123")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "127.0.0.1")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "saas_omnichannel")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017/SaaS_Chatbot")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    
    # RabbitMQ
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://admin:password123@127.0.0.1/")

    # WhatsApp Bridge - Node.js (Sprint 26)
    WHATSAPP_BRIDGE_URL: str = os.getenv("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:8081")
    BRIDGE_API_KEY: str = os.getenv("BRIDGE_API_KEY", "BOT_API_KEY_CHANGE_ME")

    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file=".env" if not os.getenv("DOCKER_CONTAINER") else None,
        extra="ignore"
    )

settings = Settings()
