from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from src.common.exceptions import AppException
from loguru import logger
import traceback
from fastapi.encoders import jsonable_encoder

def register_error_handlers(app: FastAPI):
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handler para exceções customizadas da aplicação."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "message": exc.message,
                    "code": exc.code,
                    "payload": exc.payload
                }
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handler para erros de validação do Pydantic (FastAPI)."""
        logger.warning(f"Validation error: {exc.errors()}")
        
        # Strip complex objects like ValueError from Pydantic V2 errors
        errors_clean = []
        for err in exc.errors():
            errors_clean.append({
                "loc": err.get("loc"),
                "msg": err.get("msg"),
                "type": err.get("type")
            })
            
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "message": "Validation Error",
                    "code": 422,
                    "details": errors_clean
                }
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handler global para qualquer erro não tratado (HTTP 500)."""
        logger.error(f"Unhandled error: {str(exc)}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "message": "Internal Server Error",
                    "code": 500
                }
            }
        )
