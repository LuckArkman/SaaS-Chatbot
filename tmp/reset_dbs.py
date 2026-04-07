import sys
from sqlalchemy import create_engine, MetaData, text
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

# Caminho para o projeto para importar settings
sys.path.append(os.getcwd())

from src.core.config import settings

def reset_postgres():
    print("🐘 Resetando PostgreSQL (VPS 76.13.168.200)...")
    # Conexão direta via IP externo
    db_url = f"postgresql+psycopg2://admin:password123@76.13.168.200:5432/saas_omnichannel"
    engine = create_engine(db_url)
    meta = MetaData()
    meta.reflect(bind=engine)
    
    with engine.connect() as conn:
        for table in reversed(meta.sorted_tables):
            print(f"🗑 Truncando tabela Postgres: {table.name}")
            conn.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE;'))
        
        conn.commit()
    print("✅ PostgreSQL resetado com sucesso.\n")

async def reset_mongodb():
    print("🍃 Resetando MongoDB (VPS 76.13.168.200)...")
    vps_mongo_url = "mongodb://76.13.168.200:27017/SaaS_Chatbot"
    db_name = "SaaS_Chatbot"
    client = AsyncIOMotorClient(vps_mongo_url)
    
    print(f"🔥 Dropando banco MongoDB: {db_name}")
    await client.drop_database(db_name)
    print("✅ MongoDB resetado com sucesso.\n")

async def main():
    try:
        reset_postgres()
    except Exception as e:
        print(f"❌ Erro ao resetar Postgres: {e}")
        
    try:
        await reset_mongodb()
    except Exception as e:
        print(f"❌ Erro ao resetar MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(main())
