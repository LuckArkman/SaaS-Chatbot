import httpx
from typing import Any, Dict, Optional
from src.core.config import settings
from src.models.whatsapp import WhatsAppStatus
from loguru import logger

class WhatsAppBridgeService:
    """
    Controlador de comunicação com a Ponte Node.js (Venom-bot).
    """
    def __init__(self):
        self.base_url = settings.WHATSAPP_BRIDGE_URL
        self.headers = {
            "apikey": settings.BRIDGE_API_KEY,
            "Content-Type": "application/json"
        }
        # Usamos um cliente httpx persistente para eficiência
        self.client = httpx.AsyncClient(timeout=30.0)

    async def create_session(self, session_id: str) -> bool:
        """Tenta criar uma nova sessão no Bridge (Venom)."""
        try:
            logger.info(f"[*] Solicitando criação de sessão no Bridge: {session_id}")
            response = await self.client.post(
                f"{self.base_url}/instance/create", 
                json={"sessionId": session_id},
                headers=self.headers
            )
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Bridge respondeu OK para {session_id}: {response.json()}")
                return True
            
            logger.error(f"❌ Erro ao criar sessão {session_id}. Status: {response.status_code}, Resposta: {response.text}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Falha de rede ao criar sessão {session_id}: {str(e)}")
            return False

    async def stop_instance(self, session_id: str) -> bool:
        """Para o processo do bot no Bridge."""
        try:
            logger.info(f"[*] Solicitando parada da instância no Bridge: {session_id}")
            response = await self.client.post(
                f"{self.base_url}/instance/stop", 
                json={"sessionId": session_id},
                headers=self.headers
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Instância {session_id} parada com sucesso")
                return True
            
            logger.error(f"❌ Erro ao parar instância {session_id}. Status: {response.status_code}, Resposta: {response.text}")
            return False
        except Exception as e:
            logger.error(f"❌ Falha de rede ao parar instância {session_id}: {str(e)}")
            return False

    async def restart_instance(self, session_id: str) -> bool:
        """Reinicia o processo do bot no Bridge."""
        try:
            logger.info(f"[*] Solicitando reinício da instância no Bridge: {session_id}")
            response = await self.client.post(
                f"{self.base_url}/instance/restart", 
                json={"sessionId": session_id},
                headers=self.headers
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Instância {session_id} reenviada para reinício")
                return True
            
            logger.error(f"❌ Erro ao reiniciar instância {session_id}. Status: {response.status_code}, Resposta: {response.text}")
            return False
        except Exception as e:
            logger.error(f"❌ Falha de rede ao reiniciar instância {session_id}: {str(e)}")
            return False

    async def fetch_status(self, session_id: str) -> WhatsAppStatus:
        """Verifica o status da conexão da instância (Health Check)."""
        try:
            response = await self.client.get(
                f"{self.base_url}/instance/connectionState?sessionId={session_id}",
                headers=self.headers
            )
            if response.status_code != 200:
                return WhatsAppStatus.DISCONNECTED

            state = response.json().get("state", "DISCONNECTED")
            
            mapping = {
                "CONNECTED": WhatsAppStatus.CONNECTED,
                "CONNECTING": WhatsAppStatus.CONNECTING,
                "DISCONNECTED": WhatsAppStatus.DISCONNECTED,
                "QRCODE": WhatsAppStatus.SCAN_QRCODE,
            }
            return mapping.get(state, WhatsAppStatus.DISCONNECTED)
        except Exception as e:
            logger.warning(f"⚠️ Bridge offline ou instância {session_id} inexistente: {e}")
            return WhatsAppStatus.DISCONNECTED

    async def get_qrcode(self, session_id: str) -> Optional[str]:
        """Recupera o QR Code atualizado em formato base64."""
        try:
            response = await self.client.get(
                f"{self.base_url}/instance/qrcode?sessionId={session_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json().get("qrcode")
            return None
        except Exception as e:
            logger.error(f"❌ Falha ao obter QR Code para {session_id}: {e}")
            return None

    async def logout(self, session_id: str) -> bool:
        """Desconecta a sessão do WhatsApp."""
        try:
            response = await self.client.post(
                f"{self.base_url}/instance/logout", 
                json={"sessionId": session_id},
                headers=self.headers
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Erro ao deslogar {session_id}: {e}")
            return False

    async def send_file(self, session_id: str, to: str, file_url: str, caption: str = "") -> bool:
        """Envia um arquivo via Bridge."""
        # TODO: Implementar rota de envio no Bridge Node.js se necessário
        logger.warning("Envio de arquivo via Bridge Node.js ainda não implementado no Bridge.")
        return False

# Instância Global
whatsapp_bridge = WhatsAppBridgeService()
