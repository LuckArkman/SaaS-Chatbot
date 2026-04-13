from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from src.services.contact_service import ContactService
from src.services.whatsapp_bridge_service import whatsapp_bridge
from src.services.whatsapp_manager_service import WhatsAppManagerService
from src.schemas.contact import (
    ContactCreate, ContactOut, TagOut,
    WhatsAppContactAdd, WhatsAppContactUpdate, WhatsAppContactAddOut, WhatsAppContactListOut,
    WhatsAppContactVerified,
)
from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from src.models.contact import Contact, Tag
from src.models.whatsapp import WhatsAppStatus
from loguru import logger

router = APIRouter()


# ─────────────────────────────────────────────
# Rotas existentes
# ─────────────────────────────────────────────

@router.get("/", response_model=List[ContactOut])
async def list_contacts(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca os contatos registrados do Tenant no banco de dados interno com Sincronização em Lote do WhatsApp."""
    try:
        from src.services.whatsapp_manager_service import WhatsAppManagerService
        from src.services.whatsapp_bridge_service import whatsapp_bridge
        
        instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)
        status_val = str(getattr(instance.status, "value", instance.status)).upper()
        
        if status_val == "CONNECTED":
            bridge_result = await whatsapp_bridge.list_contacts(session_id=instance.session_name)
            if bridge_result and bridge_result.get("success"):
                raw_contacts = bridge_result.get("contacts", [])
                
                # Otimiza verificação com um Set de telefones já conhecidos
                existing_phones = {
                    c.phone_number for c in 
                    db.query(Contact.phone_number).filter(Contact.tenant_id == tenant_id).all()
                }
                
                new_db_contacts = []
                for c in raw_contacts:
                    phone = c.get("phone")
                    if phone and phone not in existing_phones:
                        # Fallback seguro para o nome
                        final_name = c.get("name") or c.get("short_name") or f"WhatsApp {phone[-4:]}"
                        new_db_contacts.append(Contact(
                            tenant_id=tenant_id,
                            phone_number=phone,
                            full_name=final_name,
                            is_blacklisted=False
                        ))
                    if phone:
                        existing_phones.add(phone)
                        
                if new_db_contacts:
                    db.bulk_save_objects(new_db_contacts)
                    db.commit()
                    logger.info(f"🔄 Sincronizados {len(new_db_contacts)} novos contatos do WhatsApp para o Banco Local.")
    except Exception as e:
        logger.error(f"Erro ao auto-sincronizar contatos do WhatsApp: {e}")

    return db.query(Contact).filter(Contact.tenant_id == tenant_id).all()


@router.post("/import")
async def import_contacts_from_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Importa contatos de um arquivo CSV (Sprint 37)."""
    import codecs
    import csv
    
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use .csv")

    # 🔄 FIX CRÍTICO ANTIPADRÃO #20: (Parte 1) Streaming
    # Nunca carrega gigabytes usando 'await file.read()' para decodificar na RAM.
    # Usa stream linear (iterdecode) suportado de fábrica via SpooledTemporaryFile do FastAPI.
    csv_reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
    
    # Repassa o generator lazy pro serviço, poupando O(N) memória
    results = ContactService.import_csv(db, tenant_id, csv_reader)
    return results


@router.post("/{phone}/opt-out")
def set_opt_out(
    phone: str,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Ativa o Opt-out para um contato específico."""
    ContactService.set_blacklist(db, tenant_id, phone, status=True)
    return {"status": "opt_out_enabled", "success": True}


@router.get("/tags", response_model=List[TagOut])
def list_tags(
    db: Session = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    return db.query(Tag).all()


# ─────────────────────────────────────────────
# Novas rotas: Contatos via WhatsApp do Agente
# ─────────────────────────────────────────────

@router.post(
    "/whatsapp",
    response_model=WhatsAppContactAddOut,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar contato ao WhatsApp do agente",
    description=(
        "Verifica se o número de telefone possui uma conta WhatsApp ativa através do agente conectado, "
        "e o cadastra na lista de contatos internos do Tenant. "
        "Requer que o bot esteja CONNECTED. "
        "Retorna os dados do contato verificado e confirma a persistência no banco."
    ),
)
async def add_whatsapp_contact(
    payload: WhatsAppContactAdd,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    Rota 1: Adicionar novo contato de WhatsApp.

    Fluxo:
    1. Recupera a sessão ativa do Tenant.
    2. Garante que o bot está CONNECTED (necessário para chamar onWhatsApp no Baileys).
    3. Chama o Bridge Node.js (POST /contacts/add) que usa `sock.onWhatsApp()` para validar.
    4. Se o número existe no WhatsApp, persiste o contato no banco Postgres do Tenant.
    5. Retorna os dados completos do contato.
    """
    # 1. Recupera a instância ativa do Tenant
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)

    status_val = str(getattr(instance.status, "value", instance.status)).upper()
    if status_val != "CONNECTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"O agente não está conectado ao WhatsApp (estado atual: {status_val.lower()}). "
                "Inicie o bot e conecte-o antes de adicionar contatos."
            ),
        )

    # 2. Solicita verificação ao Bridge Baileys
    bridge_result = await whatsapp_bridge.add_contact(
        session_id=instance.session_name,
        phone=payload.phone,
        name=payload.name,
    )

    if not bridge_result.get("success"):
        error_msg = bridge_result.get("error", "O Bridge não pôde verificar o contato.")
        logger.warning(f"[Tenant:{tenant_id}] Falha ao adicionar contato {payload.phone}: {error_msg}")
        return WhatsAppContactAddOut(success=False, error=error_msg)

    bridge_contact = bridge_result.get("contact", {})
    verified_contact = WhatsAppContactVerified(**bridge_contact)

    # 3. Persiste o contato no banco Postgres do Tenant
    # Verifica se já existe pelo número normalizado
    existing = db.query(Contact).filter(
        Contact.tenant_id == tenant_id,
        Contact.phone_number == verified_contact.phone,
    ).first()

    db_contact: Optional[Contact] = existing

    if not existing:
        db_contact = Contact(
            tenant_id=tenant_id,
            phone_number=verified_contact.phone,
            full_name=payload.name or verified_contact.name,
            is_blacklisted=False,
        )
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        logger.info(
            f"✅ [Tenant:{tenant_id}] Novo contato WhatsApp persistido: "
            f"{db_contact.phone_number} (ID: {db_contact.id})"
        )
    else:
        # Atualiza o nome se foi fornecido e o contato já existia sem nome
        if payload.name and not existing.full_name:
            existing.full_name = payload.name
            db.commit()
            db.refresh(existing)
        logger.info(f"ℹ️ [Tenant:{tenant_id}] Contato {payload.phone} já cadastrado (ID: {existing.id}).")

    persisted_out = ContactOut.model_validate(db_contact)

    return WhatsAppContactAddOut(
        success=True,
        contact=verified_contact,
        persisted=persisted_out,
    )


@router.get(
    "/whatsapp",
    response_model=WhatsAppContactListOut,
    summary="Listar contatos do WhatsApp do agente",
    description=(
        "Solicita ao agente a lista completa e atualizada de contatos que o número "
        "WhatsApp do agente possui em sua agenda. "
        "Inclui todos os contatos de conversas já abertas pelo agente. "
        "Requer que o bot esteja CONNECTED."
    ),
)
async def list_whatsapp_contacts(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    Rota 2: Listar todos os contatos do WhatsApp do agente.

    Fluxo:
    1. Recupera a sessão ativa do Tenant.
    2. Garante que o bot está CONNECTED.
    3. Chama o Bridge Node.js (GET /contacts/list) que retorna sock.store.contacts.
    4. Filtra apenas contatos individuais (exclui grupos).
    5. Retorna a lista completa com total.
    """
    # 1. Recupera a instância ativa
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)

    status_val = str(getattr(instance.status, "value", instance.status)).upper()
    if status_val != "CONNECTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"O agente não está conectado ao WhatsApp (estado atual: {status_val.lower()}). "
                "Inicie e conecte o bot antes de listar contatos."
            ),
        )

    # 2. Solicita ao Bridge
    bridge_result = await whatsapp_bridge.list_contacts(session_id=instance.session_name)

    if not bridge_result.get("success"):
        error_msg = bridge_result.get("error", "O Bridge não pôde listar os contatos.")
        logger.warning(f"[Tenant:{tenant_id}] Falha ao listar contatos via Bridge: {error_msg}")
        return WhatsAppContactListOut(success=False, error=error_msg)

    raw_contacts: List[Dict] = bridge_result.get("contacts", [])
    total: int = bridge_result.get("total", len(raw_contacts))

    # 3. Serializa os contatos
    contacts_out = [WhatsAppContactVerified(**c) for c in raw_contacts]

    logger.info(
        f"✅ [Tenant:{tenant_id}] Lista de contatos WhatsApp retornada: "
        f"{total} contato(s) da sessão '{instance.session_name}'"
    )

    return WhatsAppContactListOut(
        success=True,
        total=total,
        contacts=contacts_out,
    )


import re

@router.put(
    "/whatsapp/{phone}",
    response_model=ContactOut,
    summary="Editar contato no WhatsApp e no Banco",
    description=(
        "Edita o nome do contato localmente no banco garantindo a higienização da string, "
        "e sincroniza as modificações visuais no cache em tempo real para o Baileys."
    ),
)
async def edit_whatsapp_contact(
    phone: str,
    payload: WhatsAppContactUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    # 1. Recupera a instância ativa
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)

    status_val = instance.status.value if hasattr(instance.status, "value") else str(instance.status)
    if status_val != WhatsAppStatus.CONNECTED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agente não está conectado ao WhatsApp. Conecte o bot antes de editar contatos."
        )

    # 2. Chama Bridge (Node)
    if not payload.name:
         raise HTTPException(status_code=400, detail="O nome é obrigatório para edição.")

    bridge_result = await whatsapp_bridge.edit_contact(
        session_id=instance.session_name,
        phone=phone,
        name=payload.name
    )

    if not bridge_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao editar contato via Bridge: {bridge_result.get('error')}"
        )

    # 3. Atualiza Postgres local
    # Remove qualquer coisa que não seja dígito
    normalized_phone = re.sub(r'\D', '', phone)
    existing = db.query(Contact).filter(
        Contact.tenant_id == tenant_id,
        Contact.phone_number == normalized_phone,
    ).first()

    if existing:
        existing.full_name = payload.name
        db.commit()
        db.refresh(existing)
    else:
        # Cria se não existir e o cara tentou editar a partir da Bridge
        existing = Contact(
            tenant_id=tenant_id,
            phone_number=normalized_phone,
            full_name=payload.name,
            is_blacklisted=False,
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    return existing


@router.delete(
    "/whatsapp/{phone}",
    status_code=status.HTTP_200_OK,
    summary="Deletar contato do WhatsApp e do Banco",
    description=(
        "Deleta o contato localmente na VPS do agente (Baileys) removendo o cache para que pare de listar no WhatsApp, "
        "e tenta forçar limpar o Chat fisicamente. Também remove do PostgreSQL interno."
    ),
)
async def delete_whatsapp_contact(
    phone: str,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    # 1. Recupera a instância ativa
    instance = WhatsAppManagerService.get_or_create_instance(db, tenant_id)

    status_val = instance.status.value if hasattr(instance.status, "value") else str(instance.status)
    if status_val != WhatsAppStatus.CONNECTED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agente não está conectado ao WhatsApp."
        )

    # 2. Chama Bridge
    bridge_result = await whatsapp_bridge.delete_contact(
        session_id=instance.session_name,
        phone=phone
    )

    if not bridge_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao deletar contato via Bridge: {bridge_result.get('error')}"
        )

    # 3. Deleta no Postgres
    normalized_phone = re.sub(r'\D', '', phone)
    existing = db.query(Contact).filter(
        Contact.tenant_id == tenant_id,
        Contact.phone_number == normalized_phone,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    return {"success": True, "message": f"Contato {normalized_phone} excuído com sucesso."}
