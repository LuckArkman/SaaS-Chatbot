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
    def import_csv(db: Session, tenant_id: str, csv_reader: Any) -> Dict[str, int]:
        """
        Processa um arquivo CSV e importa contatos novos em BATCH O(1).
        
        🔄 FIX CRÍTICO ANTIPADRÃO #20: (Parte 2) Fim do N+1 Quering.
        Consultar 'db.query(...).first()' iterativamente dentro de um for de CSV causa 
        um colapso de N transações simultâneas que trava a thread do FastAPI inteira.
        """
        imported = 0
        skipped = 0
        
        # 1. Puxa TODOS os telefones existentes do tenant PARA A MEMÓRIA (Set O(1))
        # Muito mais rápido que ir ao banco 100.000 vezes sequenciais.
        existing_phones_query = db.query(Contact.phone_number).filter(Contact.tenant_id == tenant_id).all()
        existing_phones = {row[0] for row in existing_phones_query}
        
        new_contacts = []
        batch_size = 1000
        
        for row in csv_reader:
            phone = ContactService.normalize_phone(row.get("phone", ""))
            if not phone:
                skipped += 1
                continue
                
            # Verifica Duplicidade instantaneamente O(1)
            if phone in existing_phones:
                skipped += 1
                continue
                
            # Protege contra duplicados dentro do PRÓPRIO CSV na mesma injeção
            existing_phones.add(phone)
            
            new_contacts.append(
                Contact(
                    phone_number=phone,
                    full_name=row.get("name", "Contato S/ Nome"),
                    tenant_id=tenant_id
                )
            )
            imported += 1
            
            # Flush Batch Paginado para salvar RAM em Carga Massiva (> 5 Milhões de leads)
            if len(new_contacts) >= batch_size:
                db.add_all(new_contacts)
                db.commit() # Salva a cada 1000 iteracoes evitando OOM Session
                new_contacts.clear()
        
        # Consolida remanescentes
        if new_contacts:
            db.add_all(new_contacts)
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
