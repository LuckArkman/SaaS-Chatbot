from typing import AsyncGenerator
from .models import AgentConfig, Role
from .providers import BaseProvider, OpenAIProvider, GeminiProvider, ClaudeProvider, GroqProvider, LlamaProvider
from .memory import MemoryManager

class AIAgent:
    """O Agente de IA Unificado"""
    def __init__(self, config: AgentConfig):
        self.config = config
        self.memory = MemoryManager(system_prompt=config.system_prompt)
        self.provider = self._init_provider()

    def _init_provider(self) -> BaseProvider:
        prov = self.config.provider.lower()
        if "openai" in prov or "chatgpt" in prov:
            return OpenAIProvider(self.config)
        elif "gemini" in prov:
            return GeminiProvider(self.config)
        elif "claude" in prov or "anthropic" in prov:
            return ClaudeProvider(self.config)
        elif "groq" in prov:
            return GroqProvider(self.config)
        elif "llama" in prov:
            return LlamaProvider(self.config)
        else:
            raise ValueError(f"Provedor de IA '{prov}' não suportado.")

    async def chat(self, message: str) -> str:
        """
        Interagir de forma assíncrona, enviando a mensagem e recebendo a resposta consolidada do LLM.
        """
        self.memory.add_message(Role.USER, message)
        
        response_text = await self.provider.generate_response(self.memory.get_context())
        
        self.memory.add_message(Role.ASSISTANT, response_text)
        return response_text

    async def chat_stream(self, message: str) -> AsyncGenerator[str, None]:
        """
        Interagir por stream para respostas progressivas.
        """
        self.memory.add_message(Role.USER, message)
        
        full_response = ""
        async for chunk in self.provider.stream_response(self.memory.get_context()):
            full_response += chunk
            yield chunk
            
        self.memory.add_message(Role.ASSISTANT, full_response)
