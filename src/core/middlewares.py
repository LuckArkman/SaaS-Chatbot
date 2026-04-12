from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.core.tenancy import set_current_tenant_id
from src.core.security import ALGORITHM
from src.core.config import settings
from src.core.database import SessionLocal
from src.services.billing_service import BillingService
from src.core.redis import redis_client
from jose import jwt
from loguru import logger

# TTL do cache de validade de plano no Redis.
# Cada tenant e consultado no banco no maximo 1x a cada 5 minutos.
# Isso elimina a query sincrona bloqueante em cada requisicao HTTP/WS.
_BILLING_CACHE_TTL_SECONDS = 300  # 5 minutos

# Chave Redis para o cache de validade do plano de um tenant.
_BILLING_CACHE_KEY = "billing:valid:{tenant_id}"

class TenancyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        """
        Intercepta a requisicao para identificar o Tenant e verificar seu plano (Sprint 31).
        Exclui rotas criticas (Auth, Webhooks) do bloqueio por falta de plano.

        CORRECAO BUG GRAVE #7:
        A verificacao de validade do plano agora usa cache Redis com TTL de 5 minutos.
        Antes, cada requisicao autenticada executava uma query psycopg2 sincrona,
        bloqueando a thread do worker do Uvicorn e degradando todas as conexoes
        simultaneas sob alta carga.

        Fluxo:
          1. Tenta ler 'billing:valid:{tenant_id}' no Redis (async, nao bloqueia).
          2. HIT  → usa o valor em cache ("1" = valido, "0" = invalido).
          3. MISS → executa a query no Postgres, armazena resultado no Redis por 5min.
        """
        # 1. Rotas que ignoram verificacao de plano
        path = request.url.path
        is_auth_route = path.startswith(f"{settings.API_V1_STR}/auth")
        is_webhook    = path.startswith(f"{settings.API_V1_STR}/gateway/webhook")
        is_docs       = path.startswith("/docs") or path.startswith("/openapi.json")

        # 2. Identificacao do Tenant via header ou JWT
        tenant_id = request.headers.get("X-Tenant-ID")

        if not tenant_id and "authorization" in request.headers:
            try:
                auth_header = request.headers["authorization"]
                if auth_header.startswith("Bearer "):
                    token   = auth_header.split(" ")[1]
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
                    tenant_id = payload.get("tenant_id")
            except Exception:
                pass

        if tenant_id:
            set_current_tenant_id(tenant_id)

            # 3. Verificacao de validade do plano (rotas protegidas apenas)
            if not (is_auth_route or is_webhook or is_docs):
                is_valid = await self._check_billing_cached(tenant_id)
                if not is_valid:
                    logger.warning(f"🚫 Acesso negado ao Tenant {tenant_id}: Assinatura expirada ou inativa.")
                    return JSONResponse(
                        status_code=status.HTTP_402_PAYMENT_REQUIRED,
                        content={"detail": "Subscription required or payment is pending. Please check your billing dashboard."}
                    )

        response = await call_next(request)
        return response

    @staticmethod
    async def _check_billing_cached(tenant_id: str) -> bool:
        """
        Verifica a validade do plano do Tenant usando cache Redis.

        - Cache HIT  (TTL ainda valido): retorna imediatamente, sem tocar o banco.
        - Cache MISS (expirado/ausente): faz a query no Postgres e armazena no Redis.

        A chave expira automaticamente apos _BILLING_CACHE_TTL_SECONDS segundos,
        garantindo que mudancas de status (pagamento, cancelamento) sejam refletidas
        em no maximo 5 minutos sem necessidade de invalidacao manual.
        """
        cache_key = _BILLING_CACHE_KEY.format(tenant_id=tenant_id)

        try:
            cached = await redis_client.get(cache_key)
            if cached is not None:
                # HIT: "1" = valido, "0" = invalido
                return cached == "1"
        except Exception as e:
            # Redis indisponivel: fallback para query direta (degraded mode)
            logger.warning(f"[BillingCache] Redis indisponivel, consultando banco diretamente: {e}")

        # MISS ou Redis indisponivel: consulta o Postgres
        with SessionLocal() as db:
            is_valid = BillingService.check_plan_validity(db, tenant_id)

        # Armazena resultado no Redis com TTL
        try:
            await redis_client.set(cache_key, "1" if is_valid else "0", expire=_BILLING_CACHE_TTL_SECONDS)
            logger.debug(f"[BillingCache] Tenant '{tenant_id}' → {'válido' if is_valid else 'inválido'} (TTL {_BILLING_CACHE_TTL_SECONDS}s)")
        except Exception as e:
            logger.warning(f"[BillingCache] Falha ao gravar cache Redis: {e}")

        return is_valid
