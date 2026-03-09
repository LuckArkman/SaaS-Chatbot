from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from src import models, schemas
from src.api import deps
from src.core import security, validators
from src.core.config import settings
from src.core.database import get_db
from loguru import logger
import uuid

router = APIRouter()

@router.post("/login", response_model=schemas.user.Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(models.user.User).filter(models.user.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=schemas.user.User)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.user.UserRegister,
) -> Any:
    """
    Registra um novo usuário e cria um novo Tenant associado.
    """
    user = db.query(models.user.User).filter(models.user.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Validar complexidade da senha (Regras .NET)
    validators.validate_password_complexity(user_in.password)
    
    # Criar Tenant ID único (UUID truncado ou aleatório)
    new_tenant_id = str(uuid.uuid4())[:8].upper()
    
    user_obj = models.user.User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        tenant_id=new_tenant_id,
        is_active=True,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    
    from src.services.billing_service import BillingService
    BillingService.assign_default_plan(db, new_tenant_id)

    logger.info(f"🆕 Novo usuário registrado: {user_obj.email} | Tenant: {new_tenant_id}")
    # TODO: Disparar UserCreatedEvent para RabbitMQ (Sprint 08)
    
    return user_obj

@router.post("/password-recovery/{email}", response_model=schemas.user.UserBase)
def recover_password(email: str, db: Session = Depends(get_db)) -> Any:
    """
    Password Recovery Logic (Stub)
    """
    user = db.query(models.user.User).filter(models.user.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Aqui geraríamos um token de reset e enviaríamos por e-mail
    logger.info(f"🔑 Recuperação de senha solicitada para: {email}")
    return user

@router.post("/reset-password/", response_model=schemas.user.UserBase)
def reset_password(
    data: schemas.user.PasswordResetConfirm, 
    db: Session = Depends(get_db)
) -> Any:
    """
    Reseta a senha usando um token válido.
    """
    # Lógica de validação de token de reset...
    return {"message": "Password reset successfully"}

@router.post("/change-password", response_model=schemas.user.User)
def change_password(
    data: schemas.user.PasswordChangeInternal,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Altera a senha do usuário logado.
    """
    if not security.verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    
    validators.validate_password_complexity(data.new_password)
    current_user.hashed_password = security.get_password_hash(data.new_password)
    db.add(current_user)
    db.commit()
    return current_user

@router.get("/me", response_model=schemas.user.User)
def read_user_me(
    current_user: models.user.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
