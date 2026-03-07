from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from src.services.contact_service import ContactService
from src.schemas.contact import ContactCreate, ContactOut, TagOut
from src.api import deps
from src.core.database import get_db
from src.core.tenancy import get_current_tenant_id
from src.models.contact import Contact, Tag
from loguru import logger

router = APIRouter()

@router.get("/", response_model=List[ContactOut])
def list_contacts(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Busca os contatos registrados do Tenant."""
    return db.query(Contact).filter(Contact.tenant_id == tenant_id).all()

@router.post("/import")
async def import_contacts_from_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Any = Depends(deps.get_current_active_user)
) -> Any:
    """Importa contatos de um arquivo CSV (Sprint 37)."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use .csv")
        
    content = await file.read()
    results = ContactService.import_csv(db, tenant_id, content.decode("utf-8"))
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
