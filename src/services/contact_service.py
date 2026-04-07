from sqlalchemy.orm import Session
from src.models.contact import Contact, Tag
from loguru import logger
from typing import List, Dict, Any, Optional
import io
import csv

class ContactService:
    """
    Motor de Importação e Segmentação de Leads.
    Replica o 'LeadImporterService' do .NET.
    """
    @staticmethod
    def normalize_phone(phone: str) -> str:
        """Normaliza o número para o padrão DDI + DDD + Número."""
        # Limpa caracteres não numéricos
        clean = "".join(filter(str.isdigit, phone))
        
        # Se começar com 0, remove
        if clean.startswith("0"):
            clean = clean[1:]
            
        # Se for BR e não tiver DDI
        if len(clean) == 10 or len(clean) == 11:
            clean = "55" + clean
            
        return clean

    @staticmethod
    def import_csv(db: Session, tenant_id: str, csv_content: str) -> Dict[str, int]:
        """Processa um arquivo CSV e importa contatos novos."""
        reader = csv.DictReader(io.StringIO(csv_content))
        imported = 0
        skipped = 0
        
        for row in reader:
            phone = ContactService.normalize_phone(row.get("phone", ""))
            if not phone:
                skipped += 1
                continue
                
            # Verifica Duplicidade
            exists = db.query(Contact).filter(
                Contact.tenant_id == tenant_id,
                Contact.phone_number == phone
            ).first()
            
            if exists:
                skipped += 1
                continue
                
            new_contact = Contact(
                phone_number=phone,
                full_name=row.get("name", "Contato S/ Nome"),
                tenant_id=tenant_id
            )
            db.add(new_contact)
            imported += 1
            
        db.commit()
        logger.info(f"📊 Importação completa para {tenant_id}: {imported} novos contatos.")
        return {"imported": imported, "skipped": skipped}

    @staticmethod
    def get_contacts_by_tags(db: Session, tenant_id: str, tag_ids: List[int]) -> List[Contact]:
        """Filtra contatos que possuem as tags especificadas (Segmentação)."""
        return db.query(Contact).join(Contact.tags).filter(
            Contact.tenant_id == tenant_id,
            Tag.id.in_(tag_ids),
            Contact.is_blacklisted == False
        ).all()

    @staticmethod
    def set_blacklist(db: Session, tenant_id: str, phone: str, status: bool = True):
        """Marca um contato como Blacklist (Opt-out)."""
        contact = db.query(Contact).filter(
            Contact.tenant_id == tenant_id,
            Contact.phone_number == phone
        ).first()
        
        if contact:
            contact.is_blacklisted = status
            db.commit()
            logger.info(f"🛑 Contato {phone} (Tenant: {tenant_id}) marcou Opt-out.")

    @staticmethod
    def get_or_create_contact(db: Session, tenant_id: str, phone: str, name: str = "Contato S/ Nome") -> Contact:
        """Busca ou cria um contato/lead no CRM do Tenant (Sprint 43)."""
        phone = ContactService.normalize_phone(phone)
        contact = db.query(Contact).filter(
            Contact.tenant_id == tenant_id,
            Contact.phone_number == phone
        ).first()

        if not contact:
            contact = Contact(
                phone_number=phone,
                full_name=name,
                tenant_id=tenant_id
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
            logger.info(f"👤 Novo contato registrado via interação: {phone} (Tenant: {tenant_id})")
        
        return contact
