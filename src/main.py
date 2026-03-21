from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.api.v1.api import api_router
from src.core.middlewares import TenancyMiddleware
from src.common.error_handlers import register_error_handlers
from src.core.redis import redis_client
from src.core.bus import rabbitmq_bus
from src.core.bridge import start_websocket_bridge
from src.core.logging import setup_logging
from src.common.logging_middleware import LoggingMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from src.models.mongo.flow import FlowDocument, SessionStateDocument
from src.workers.flow_worker import flow_worker
from src.workers.ack_worker import ack_worker
from src.services.whatsapp_manager_service import WhatsAppManagerService
from src.core.database import SessionLocal, engine, Base
from loguru import logger
import asyncio

# Importa todos os modelos para registro no SQLAlchemy (Metadata)
from src.models import user, chat, whatsapp, billing, campaign, contact, department, invoice, transaction

from fastapi.staticfiles import StaticFiles
from src.services.storage_service import StorageService

def create_application() -> FastAPI:
    """
    Equivalente ao Program.cs / CreateBuilder no .NET
    """
    # Inicializa Logging Centralizado
    setup_logging()
    
    # Garante pasta de mídias (Sprint 30)
    StorageService.ensure_upload_dir()

    application = FastAPI(
        title="SaaS Chatbot",
        description="""
        🚀 Plataforma OmniChannel de Chatbots e Atendimento Humano.
        Migrada de .NET para Python (FastAPI) para alta performance e escalabilidade.
        
        Principais Módulos:
        * **Auth/Tenancy**: Gestão de acessos isolados.
        * **FlowEngine**: Automação de diálogos.
        * **WhatsApp**: Integração via Venom/Evolution.
        * **Billing**: Faturamento e Quotas.
        """,
        version="2.0.0",
        contact={
            "name": "Mauricio Paixão Lopes",
            "url": "https://mauriciopaixaolopes.vercel.app/",
        },
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
    )

    # Registro de Handlers de Erro
    register_error_handlers(application)

    # Middlewares Customizados
    application.add_middleware(LoggingMiddleware)
    application.add_middleware(TenancyMiddleware)

    # Serving Estático de Mídias
    application.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # Inclusão de Rotas
    application.include_router(api_router, prefix=settings.API_V1_STR)

    # Configuração de CORS (Essencial para o ChatUI)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def start_bot_monitoring():
        """Tarefa de background que monitora a saúde das instâncias do bot."""
        while True:
            try:
                with SessionLocal() as db:
                    await WhatsAppManagerService.health_check_all(db)
                await asyncio.sleep(30) # A cada 30 segundos
            except Exception as e:
                logger.error(f"❌ Erro no monitoramento de bots: {e}")
                await asyncio.sleep(10)

    async def start_billing_monitoring():
        """Monitora vencimentos e renovações financeiras (Sprint 35)."""
        from src.services.billing_notification_service import BillingNotificationService
        while True:
            try:
                with SessionLocal() as db:
                    await BillingNotificationService.process_billing_heartbeat(db)
                await asyncio.sleep(3600) # De hora em hora (SaaS Default)
            except Exception as e:
                logger.error(f"❌ Erro no monitoramento financeiro: {e}")
                await asyncio.sleep(60)

    @application.on_event("startup")
    async def startup_event():
        logger.info("🚀 Iniciando SaaS Chatbot API em Python...")
        
        # 🟢 Teste de Conectividade do Banco de Dados
        try:
            logger.info(f"🔍 Testando conexão com PostgreSQL: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}...")
            # Testa ping simples no engine
            with engine.connect() as conn:
                pass
            logger.info("✅ Conexão PostgreSQL OK.")
            
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Tabelas SQL verificadas/criadas.")
        except Exception as e:
            logger.error(f"❌ Falha crítica ao conectar no PostgreSQL: {e}")
            # Aguarda um pouco em caso de falha para não sobrecarregar o CPU em loop de restart do PM2
            await asyncio.sleep(5)
            raise
        await redis_client.connect()
        
        # 🟢 Conectar RabbitMQ
        await rabbitmq_bus.connect()
        
        # 🟢 Conectar e Inicializar MongoDB (Beanie)
        from src.models.mongo.flow import FlowDocument, SessionStateDocument
        from src.models.mongo.chat import MessageDocument # ← Novo Modelo
        
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=client.get_default_database(),
            document_models=[
                FlowDocument, 
                SessionStateDocument,
                MessageDocument # ← Adicionado aqui
            ]
        )
        logger.info(f"💾 MongoDB Initialized via Beanie: {settings.MONGODB_URL}")
        
        # 🟢 Inicia Bridge em Background (SignalR Equivalent)
        asyncio.create_task(start_websocket_bridge())
        
        # 🟢 Inicia Motor de Fluxo (FlowEngine Equivalent)
        asyncio.create_task(flow_worker.start())
        
        # 🟢 Inicia Rastreamento de Status (AckTracker Equivalent)
        asyncio.create_task(ack_worker.start())
        
        from src.workers.campaign_worker import campaign_worker
        # 🟢 Inicia Monitoramento de Bots (BotMonitor Equivalent)
        asyncio.create_task(start_bot_monitoring())
        
        # 🟢 Inicia Monitoramento Financeiro (BillingMonitor)
        asyncio.create_task(start_billing_monitoring())

        # 🟢 Inicia Dispatcher de Campanhas (Broadcasting)
        asyncio.create_task(campaign_worker.start())

    @application.on_event("shutdown")
    async def shutdown_event():
        logger.info("🛑 Encerrando SaaS Chatbot API...")
        await redis_client.disconnect()
        await rabbitmq_bus.disconnect()

    return application

app = create_application()

if __name__ == "__main__":
    import uvicorn
    # Em produção/PM2 evitamos o reload=True para não conflitar com gerenciadores de processo
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
