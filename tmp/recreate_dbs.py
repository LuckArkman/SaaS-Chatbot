import sys
import os
import asyncio
from sqlalchemy import create_engine
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Caminho para o projeto
sys.path.append(os.getcwd())

from src.core.config import settings
from src.core.database import Base

# Importar todos os modelos para registrar no Base.metadata (Postgres)
# e no init_beanie (MongoDB)
from src.models.user import User
from src.models.department import Department
from src.models.chat import Conversation, Message
from src.models.contact import Contact, Tag
from src.models.whatsapp import WhatsAppInstance
from src.models.whatsapp_events import WhatsAppSystemEvent
from src.models.billing import Plan, Subscription
from src.models.invoice import Invoice
from src.models.transaction import Transaction
from src.models.campaign import Campaign, CampaignContact

from src.models.mongo.chat import MessageDocument
from src.models.mongo.flow import FlowDocument

async def recreate_postgres():
    print("🐘 Recriando tabelas PostgreSQL (VPS 76.13.168.200)...")
    db_url = f"postgresql+psycopg2://admin:password123@76.13.168.200:5432/saas_omnichannel"
    engine = create_engine(db_url)
    
    # Drop e recriação total (garantindo estrutura limpa)
    Base.metadata.drop_all(bind=engine)
    print("🗑 Estrutura antiga removida.")
    Base.metadata.create_all(bind=engine)
    print("✅ Estrutura PostgreSQL recriada com sucesso.\n")

async def recreate_mongo():
    print("🍃 Inicializando coleções MongoDB (VPS 76.13.168.200)...")
    vps_mongo_url = "mongodb://76.13.168.200:27017/SaaS_Chatbot"
    client = AsyncIOMotorClient(vps_mongo_url)
    db = client["SaaS_Chatbot"]
    
    # O Beanie cria as coleções automaticamente ao inicializar se passarmos os documentos
    await init_beanie(
        database=db,
        document_models=[
            MessageDocument,
            FlowDocument
        ]
    )
    print("✅ Coleções MongoDB inicializadas com sucesso.\n")

async def main():
    try:
        await recreate_postgres()
    except Exception as e:
        print(f"❌ Erro ao recriar Postgres: {e}")
        
    try:
        await recreate_mongo()
    except Exception as e:
        print(f"❌ Erro ao recriar MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(main())
