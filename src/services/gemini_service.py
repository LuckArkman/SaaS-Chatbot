import httpx
from typing import List, Dict, Optional
from src.core.config import settings
from loguru import logger


class GeminiService:
    """
    Serviço de integração com o Google Gemma 3 12B via Google AI Studio API.
    Suporta histórico de conversa multi-turn para respostas contextuais.
    """
    # Gemma 3 12B (instrução) — disponível via Google Generative Language API
    MODEL = "gemma-3-12b-it"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    @classmethod
    def _api_url(cls) -> str:
        model = getattr(settings, "GEMINI_MODEL", cls.MODEL)
        return f"{cls.BASE_URL}/{model}:generateContent"


    @staticmethod
    async def generate_response(
        user_message: str,
        system_prompt: str = "",
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Envia uma mensagem ao Gemini e retorna a resposta gerada.
        
        Args:
            user_message: Mensagem mais recente do usuário.
            system_prompt: Instrução de sistema (ex: "Você é um assistente...").
            conversation_history: Lista de turns anteriores [{"role": "user"|"model", "parts": [{"text": "..."}]}]
        
        Returns:
            Texto da resposta do modelo ou mensagem de fallback.
        """
        if conversation_history is None:
            conversation_history = []

        # Monta os turns do histórico + novo input do usuário
        contents = list(conversation_history)
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}]
        })

        payload: Dict = {"contents": contents}

        # Adiciona system instruction se definida (suportado nativamente pelo Gemini API)
        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        # Configurações de geração
        payload["generationConfig"] = {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.9
        }

        api_key = settings.GEMINI_API_KEY
        url = f"{GeminiService._api_url()}?key={api_key}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

                # Extrai o texto da resposta
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "").strip()
                        logger.info(f"🧠 Gemma respondeu ({len(text)} chars)")
                        return text

                logger.warning("⚠️ Gemma retornou resposta vazia ou sem candidatos.")
                return "Desculpe, não consegui processar sua mensagem. Pode repetir?"

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Erro HTTP ao chamar Gemma: {e.response.status_code} - {e.response.text}")
            return "Estou com dificuldades técnicas no momento. Tente novamente em instantes."
        except Exception as e:
            logger.error(f"❌ Falha inesperada ao chamar Gemma: {e}")
            return "Desculpe, ocorreu um erro interno. Por favor, tente novamente."


    @staticmethod
    def build_history_from_messages(messages: List[Dict]) -> List[Dict]:
        """
        Converte o histórico de mensagens do MongoDB/Postgres
        para o formato multi-turn do Gemini.
        
        Esperado: [{"side": "client"|"bot", "content": "..."}]
        Retorna:  [{"role": "user"|"model", "parts": [{"text": "..."}]}]
        """
        history = []
        for msg in messages:
            side = msg.get("side", "client")
            content = msg.get("content", "")
            if not content:
                continue
            history.append({
                "role": "user" if side == "client" else "model",
                "parts": [{"text": content}]
            })
        return history
