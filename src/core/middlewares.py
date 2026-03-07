from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.core.tenancy import set_current_tenant_id
from src.core.security import ALGORITHM
from src.core.config import settings
from src.core.database import SessionLocal
from src.services.billing_service import BillingService
from jose import jwt
from loguru import logger

class TenancyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        """
        Intercepta a requisição para identificar o Tenant e verificar seu plano (Sprint 31).
        Exclui rotas críticas (Auth, Webhooks) do bloqueio por falta de plano para permitir recuperação.
        """
        # 1. Ignorar rotas que não precisam de isolamento ou verificação de plano (Onboarding)
        path = request.url.path
        is_auth_route = path.startswith(f"{settings.API_V1_STR}/auth")
        is_webhook = path.startswith(f"{settings.API_V1_STR}/gateway/webhook") # Recebe mensagens mesmo pendente
        is_docs = path.startswith("/docs") or path.startswith("/openapi.json")

        # 2. Identificação do Tenant
        tenant_id = request.headers.get("X-Tenant-ID")
        
        if not tenant_id and "authorization" in request.headers:
            try:
                auth_header = request.headers["authorization"]
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
                    tenant_id = payload.get("tenant_id")
            except Exception:
                pass

        if tenant_id:
            set_current_tenant_id(tenant_id)
            
            # --- 🟢 Verificação de Validade de Plano (Sprint 31) ---
            # Só bloqueia rotas "normais" se o Tenant estiver inadimplente
            if not (is_auth_route or is_webhook or is_docs):
                with SessionLocal() as db:
                    is_valid = BillingService.check_plan_validity(db, tenant_id)
                    if not is_valid:
                        logger.warning(f"🚫 Acesso negado ao Tenant {tenant_id}: Assinatura expirada ou inativa.")
                        return JSONResponse(
                            status_code=status.HTTP_402_PAYMENT_REQUIRED,
                            content={"detail": "Subscription required or payment is pending. Please check your billing dashboard."}
                        )

        response = await call_next(request)
        return response
