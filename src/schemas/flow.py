from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class NodeType(str, Enum):
    START = "input"
    MESSAGE = "message"
    AI = "ai"
    HANDOVER = "handover"
    CONDITION = "condition"
    WAIT = "wait"
    AB_SPLIT = "ab_split"

class Position(BaseModel):
    x: float
    y: float

class FlowNode(BaseModel):
    id: str
    type: NodeType
    label: str
    position: Position
    data: Dict[str, Any] = Field(default_factory=dict)

class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class FlowDefinition(BaseModel):
    id: str
    tenant_id: str
    name: str
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    trigger_keyword: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

class FlowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    trigger_keywords: List[str] = []

class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[FlowNode]] = None
    edges: Optional[List[FlowEdge]] = None
    trigger_keywords: Optional[List[str]] = None
    is_active: Optional[bool] = None
