import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import datetime

# Caminho para o projeto
sys.path.append(os.getcwd())

from src.core.config import settings
from src.core.database import SessionLocal
from src.services.billing_service import BillingService
from src.models.user import User

def seed_tenant(db: Session, tenant_id: str):
    print(f"🌱 Semeando Tenant {tenant_id}...")
    
    # 1. Atribuir Plano (Trial)
    BillingService.assign_default_plan(db, tenant_id)
    print(f"🎁 Plano atribuído com sucesso.")
    
    # 2. Criar Usuário Admin (opcional, para testes se necessário)
    # Verificamos se o usuário já existe
    admin_email = f"admin_{tenant_id.lower()}@saas-chatbot.com"
    existing_user = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_user:
        from src.core.security import get_password_hash
        admin_user = User(
            email=admin_email,
            full_name=f"Admin {tenant_id}",
            hashed_password=get_password_hash("saas_admin_2026"),
            is_active=True,
            is_superuser=True,
            tenant_id=tenant_id
        )
        db.add(admin_user)
        db.commit()
        print(f"👤 Usuário Admin criado: {admin_email} (Senha: saas_admin_2026)")
    else:
        print(f"👤 Usuário Admin já existe.")

def main():
    # Conexão direta para a VPS (76.13.168.200)
    db_url = f"postgresql+psycopg2://admin:password123@76.13.168.200:5432/saas_omnichannel"
    engine = create_engine(db_url)
    
    with Session(engine) as db:
        tenant_id = "A0BC60D4" # O tenantID que está bloqueado na imagem
        
        try:
            seed_tenant(db, tenant_id)
            print("\n✅ Tenant desbloqueado com sucesso.")
        except Exception as e:
            print(f"\n❌ Erro ao semear tenant: {e}")

if __name__ == "__main__":
    main()
