import httpx
from typing import Any, Dict, Optional
from src.core.config import settings
from src.models.whatsapp import WhatsAppStatus
from loguru import logger

class WhatsAppBridgeService:
    """
    Controlador de comunicação com a Ponte Node.js (Venom/Evolution).
    Substitui o 'BotProcessManager' do .NET que gerenciava os processos C#/Node.
    """
    def __init__(self):
        self.base_url = settings.WHATSAPP_BRIDGE_URL
        self.headers = {
            "apikey": settings.BRIDGE_API_KEY,
            "Content-Type": "application/json"
        }

    async def create_session(self, session_key: str) -> Dict[str, Any]:
        """
        Solicita a criação de uma nova sessão para um Tenant.
        A Ponte Node.js deve iniciar o navegador (Puppeteer) e aguardar o QR Code.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/instance/create",
                    json={"instanceName": session_key},
                    headers=self.headers
                )
                response.raise_for_status()
                logger.info(f"🤖 Instância {session_key} iniciada no Bridge")
                return response.json()
        except Exception as e:
            logger.error(f"❌ Falha ao criar sessão {session_key}: {e}")
            return {"error": str(e), "success": False}

    async def get_qrcode(self, session_key: str) -> Optional[str]:
        """Recupera o QR Code atualizado em formato base64."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/instance/qrcode?instance={session_key}",
                    headers=self.headers
                )
                # No Evolution API, o QR base64 vem no body
                data = response.json()
                return data.get("base64")
        except Exception as e:
            logger.error(f"❌ Falha ao obter QR Code para {session_key}: {e}")
            return None

    async def fetch_status(self, session_key: str) -> WhatsAppStatus:
        """Verifica o status da conexão da instância (Health Check)."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/instance/connectionState?instance={session_key}",
                    headers=self.headers
                )
                state = response.json().get("instance", {}).get("state", "DISCONNECTED")
                
                mapping = {
                    "open": WhatsAppStatus.CONNECTED,
                    "connecting": WhatsAppStatus.CONNECTING,
                    "close": WhatsAppStatus.DISCONNECTED,
                    "refused": WhatsAppStatus.ERR_SESSION
                }
                return mapping.get(state.lower(), WhatsAppStatus.DISCONNECTED)
        except Exception as e:
            logger.warning(f"⚠️ Bridge offline ou instância {session_key} inexistente: {e}")
            return WhatsAppStatus.DISCONNECTED

    async def logout(self, session_key: str) -> bool:
        """Desconecta a sessão do WhatsApp e remove os dados temporários."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(
                    f"{self.base_url}/instance/logout?instance={session_key}",
                    headers=self.headers
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Erro ao deslogar {session_key}: {e}")
            return False

    async def send_file(self, session_key: str, to: str, file_url: str, caption: str = "") -> bool:
        """Envia um arquivo (Imagem, PDF, Audio) para o contato pelo Bridge."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/message/sendMedia?instance={session_key}",
                    json={
                        "number": to,
                        "media": file_url,
                        "mediatype": "document", # O Bridge pode auto-extrair se for URL
                        "caption": caption
                    },
                    headers=self.headers
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Falha ao enviar mídia para {to}: {e}")
            return False

# Instância Global
whatsapp_bridge = WhatsAppBridgeService()
