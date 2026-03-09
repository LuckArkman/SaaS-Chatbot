from typing import Generic, TypeVar, List, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    """Wrapper padrão para respostas da API."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None

class PagedResponse(BaseModel, Generic[T]):
    """Wrapper para listas paginadas."""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

class ErrorDetail(BaseModel):
    """Estrutura detalhada de erro."""
    message: str
    code: int
    details: Optional[Any] = None

class ErrorResponse(BaseModel):
    """Resposta padrão de erro."""
    success: bool = False
    error: ErrorDetail
