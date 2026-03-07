from typing import Optional
from pydantic import BaseModel, Field

class FilterParams(BaseModel):
    """
    Parâmetros base para filtragem, ordenação e paginação.
    Inspirado nos padrões OData/REST do .NET.
    """
    page: int = Field(1, ge=1, description="Número da página")
    size: int = Field(20, ge=1, le=100, description="Itens por página")
    search: Optional[str] = Field(None, description="Termo de busca global")
    sort_by: Optional[str] = Field(None, description="Campo para ordenação")
    descending: bool = Field(False, description="Ordem decrescente")

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.size
