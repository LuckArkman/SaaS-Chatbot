from typing import List, Optional, Any
from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from src.schemas.flow import FlowNode, FlowEdge

class FlowDocument(Document):
    """
    Representação persistente de um Fluxo no MongoDB via Beanie.
    Replaces the 'Flow' C# entity from .NET.
    """
    id: Optional[PydanticObjectId] = Field(None, alias="_id")
    tenant_id: Indexed(str)
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    
    # Estrutura do Grafo
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    
    # Configurações de Gatilho
    trigger_keywords: List[str] = Field(default_factory=list)
    is_active: bool = True
    
    # Auditoria
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

    class Settings:
        name = "flows"
        indexes = [
            "tenant_id",
            [("tenant_id", 1), ("name", 1)],
            [("tenant_id", 1), ("is_active", 1)]
        ]

class SessionStateDocument(Document):
    """
    Estado da sessão atual de um usuário em um fluxo específico.
    Controla em qual nó o usuário parou e as variáveis coletadas.
    """
    tenant_id: Indexed(str)
    contact_phone: Indexed(str)
    flow_id: Indexed(str)
    current_node_id: str
    
    # Variáveis coletadas durante o fluxo (ex: nome, idade, intenção)
    variables: dict = Field(default_factory=dict)
    
    # Controle de Tempo e Handover (Sprint 21)
    last_interaction: datetime = Field(default_factory=datetime.utcnow)
    is_completed: bool = False
    is_human_support: bool = False

    class Settings:
        name = "flow_sessions"
