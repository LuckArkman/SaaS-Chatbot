from src.common.schemas import UnifiedMessage, ChannelType, UnifiedMessageType
from src import schemas
from datetime import datetime
from loguru import logger
from typing import Any, Dict

class MessageNormalizer:
    @staticmethod
    def from_whatsapp(tenant_id: str, ws_message: Dict[str, Any]) -> UnifiedMessage:
        """
        Converte o payload bruto do WhatsApp (Venom/Evolution) para o formato unificado.
        Replicando a lógica de mapeamento de canais do projeto .NET original.
        """
        try:
            # Mapeamento de Tipos (WhatsApp -> Unified)
            ws_type = ws_message.get("type", "chat")
            unified_type = UnifiedMessageType.TEXT
            
            if ws_type in ["image", "video", "audio", "document"]:
                unified_type = UnifiedMessageType(ws_type) if ws_type != "document" else UnifiedMessageType.FILE
            
            # Sanitização e Normalização
            content = ws_message.get("body", "")
            
            # Enriquecimento
            unified_msg = UnifiedMessage(
                message_id=ws_message.get("id", ""),
                tenant_id=tenant_id,
                channel=ChannelType.WHATSAPP,
                from_id=ws_message.get("from", ""),
                to_id=ws_message.get("to", ""),
                type=unified_type,
                content=content,
                caption=ws_message.get("caption"),
                metadata={
                    "notifyName": ws_message.get("notifyName"),
                    "mimetype": ws_message.get("mimetype"),
                    "isMedia": ws_message.get("isMedia", False)
                },
                timestamp=datetime.fromtimestamp(ws_message.get("t", datetime.utcnow().timestamp()))
            )
            
            # Chama Limpeza Básica (Sprint 13 Checklist 2)
            unified_msg.sanitize_content()
            
            return unified_msg

        except Exception as e:
            logger.error(f"❌ Falha crítica ao normalizar mensagem do WhatsApp: {e}")
            raise
