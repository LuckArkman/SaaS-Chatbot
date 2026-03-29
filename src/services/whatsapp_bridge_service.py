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
            
            if response.status_code == 200 or response.status_code == 404:
                logger.info(f"✅ Instância {session_id} parada com sucesso (ou já estava parada. Status: {response.status_code})")
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
                "QRCODE": WhatsAppStatus.QRCODE,
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
        logger.warning("Envio de arquivo via Bridge Node.js ainda não implementado no Bridge.")
        return False

    async def add_contact(self, session_id: str, phone: str, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifica se um número tem conta WhatsApp ativa e o valida como contato.
        Utiliza o endpoint /contacts/add do Bridge Node.js (Baileys onWhatsApp).

        Retorna dict com: success, contact (jid, phone, name, verified) ou error.
        """
        try:
            payload = {"sessionId": session_id, "phone": phone}
            if name:
                payload["name"] = name

            logger.info(f"[Bridge] Verificando/adicionando contato {phone} na sessão {session_id}")
            response = await self.client.post(
                f"{self.base_url}/contacts/add",
                json=payload,
                headers=self.headers
            )

            data = response.json()

            if response.status_code == 200:
                logger.info(f"✅ Contato {phone} verificado com sucesso: {data.get('contact', {}).get('jid')}")
                return {"success": True, "contact": data.get("contact", {})}

            if response.status_code == 422:
                # Número não tem conta WhatsApp – não é erro de rede
                return {"success": False, "error": data.get("error", "Número sem conta WhatsApp.")}

            logger.error(f"❌ Bridge retornou {response.status_code} ao adicionar contato {phone}: {data}")
            return {"success": False, "error": data.get("error", "Erro inesperado no Bridge.")}

        except Exception as e:
            logger.error(f"❌ Falha de rede ao adicionar contato {phone}: {e}")
            return {"success": False, "error": str(e)}

    async def list_contacts(self, session_id: str) -> Dict[str, Any]:
        """
        Solicita ao Bridge a lista completa de contatos WhatsApp conhecidos pela sessão.
        Utiliza o endpoint GET /contacts/list do Bridge Node.js.

        Retorna dict com: success, total, contacts (lista de {jid, phone, name, short_name}).
        """
        try:
            logger.info(f"[Bridge] Solicitando lista de contatos da sessão {session_id}")
            response = await self.client.get(
                f"{self.base_url}/contacts/list",
                params={"sessionId": session_id},
                headers=self.headers
            )

            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                logger.info(f"✅ Lista de contatos recebida: {total} contato(s) para sessão {session_id}")
                return {"success": True, "total": total, "contacts": data.get("contacts", [])}

            if response.status_code in [404, 409]:
                data = response.json()
                return {"success": False, "error": data.get("error", "Sessão indisponível.")}

            logger.error(f"❌ Bridge retornou {response.status_code} ao listar contatos: {response.text}")
            return {"success": False, "error": "Erro inesperado no Bridge ao listar contatos."}

        except Exception as e:
            logger.error(f"❌ Falha de rede ao listar contatos da sessão {session_id}: {e}")
            return {"success": False, "error": str(e)}

# Instância Global
whatsapp_bridge = WhatsAppBridgeService()
