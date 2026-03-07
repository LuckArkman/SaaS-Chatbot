from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from loguru import logger

def create_application() -> FastAPI:
    """
    Equivalente ao Program.cs / CreateBuilder no .NET
    """
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
    )

    # Configuração de CORS (Essencial para o ChatUI)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Em produção, use uma lista real como settings.ALLOWED_HOSTS
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.on_event("startup")
    async def startup_event():
        logger.info("🚀 Iniciando SaaS Chatbot API em Python...")
        # Aqui entraremos com a inicialização de DBs nas próximas etapas

    @application.on_event("shutdown")
    async def shutdown_event():
        logger.info("🛑 Encerrando SaaS Chatbot API...")

    @application.get("/")
    async def root():
        return {
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "online"
        }

    return application

app = create_application()
