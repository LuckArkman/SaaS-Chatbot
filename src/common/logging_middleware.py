from fastapi import Request
import uuid
import time
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from src.core.tenancy import get_current_tenant_id

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Gera Correlation ID para rastrear a requisição
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        start_time = time.time()
        
        # Enriquece o log com informações do Tenant e Correlation ID
        tenant_id = get_current_tenant_id() or "ANONYMOUS"
        
        with logger.contextualize(correlation_id=correlation_id, tenant_id=tenant_id):
            logger.info(f"Incoming request: {request.method} {request.url.path}")
            
            try:
                response = await call_next(request)
                process_time = (time.time() - start_time) * 1000
                
                logger.info(
                    f"Completed request: {request.method} {request.url.path} "
                    f"Status: {response.status_code} Time: {process_time:.2f}ms"
                )
                
                # Propaga o Correlation ID na resposta
                response.headers["X-Correlation-ID"] = correlation_id
                return response
                
            except Exception as e:
                logger.error(f"Request failed: {request.method} {request.url.path} Error: {str(e)}")
                raise e
