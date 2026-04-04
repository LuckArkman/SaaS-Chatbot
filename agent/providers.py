import abc
from typing import List, AsyncGenerator
from .models import AgentConfig, Message, Role

class BaseProvider(abc.ABC):
    def __init__(self, config: AgentConfig):
        self.config = config

    @abc.abstractmethod
    async def generate_response(self, messages: List[Message]) -> str:
        """Gerar texto consolidado"""
        pass

    @abc.abstractmethod
    async def stream_response(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        """Gerar texto por stream"""
        pass


class OpenAIProvider(BaseProvider):
    """Provedor para ChatGPT (OpenAI)"""
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        try:
            import openai
            self.client = openai.AsyncOpenAI(api_key=self.config.api_key)
        except ImportError:
            raise ImportError("Instale o pacote 'openai' para usar o OpenAIProvider")

    async def generate_response(self, messages: List[Message]) -> str:
        formatted_msgs = [{"role": m.role.value, "content": m.content} for m in messages]
        response = await self.client.chat.completions.create(
            model=self.config.model or "gpt-4-turbo",
            messages=formatted_msgs,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
        )
        return response.choices[0].message.content

    async def stream_response(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        formatted_msgs = [{"role": m.role.value, "content": m.content} for m in messages]
        response = await self.client.chat.completions.create(
            model=self.config.model or "gpt-4-turbo",
            messages=formatted_msgs,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            stream=True
        )
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class GeminiProvider(BaseProvider):
    """Provedor para Google Gemini"""
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.config.api_key)
            self.model = genai.GenerativeModel(self.config.model or "gemini-pro")
        except ImportError:
            raise ImportError("Instale o pacote 'google-generativeai' para usar o GeminiProvider")

    def _convert_messages(self, messages: List[Message]):
        # Gemini usa "user" e "model"
        formatted = []
        for m in messages:
            if m.role == Role.SYSTEM:
                continue # Gemini lida com system prompts via config
            role = "user" if m.role == Role.USER else "model"
            formatted.append({"role": role, "parts": [m.content]})
        return formatted

    async def generate_response(self, messages: List[Message]) -> str:
        # Pega a thread e executa
        history = self._convert_messages(messages[:-1])
        chat = self.model.start_chat(history=history)
        response = await chat.send_message_async(messages[-1].content)
        return response.text

    async def stream_response(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        history = self._convert_messages(messages[:-1])
        chat = self.model.start_chat(history=history)
        response = await chat.send_message_async(messages[-1].content, stream=True)
        async for chunk in response:
            yield chunk.text


class ClaudeProvider(BaseProvider):
    """Provedor para Anthropic Claude"""
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        try:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=self.config.api_key)
        except ImportError:
            raise ImportError("Instale o pacote 'anthropic' para usar o ClaudeProvider")

    def _get_system_and_messages(self, messages: List[Message]):
        system_prompt = next((m.content for m in messages if m.role == Role.SYSTEM), "")
        formatted_msgs = [{"role": m.role.value, "content": m.content} for m in messages if m.role != Role.SYSTEM]
        return system_prompt, formatted_msgs

    async def generate_response(self, messages: List[Message]) -> str:
        system, msgs = self._get_system_and_messages(messages)
        response = await self.client.messages.create(
            model=self.config.model or "claude-3-opus-20240229",
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            system=system,
            messages=msgs
        )
        return response.content[0].text

    async def stream_response(self, messages: List[Message]) -> AsyncGenerator[str, None]:
        system, msgs = self._get_system_and_messages(messages)
        async with self.client.messages.stream(
            model=self.config.model or "claude-3-opus-20240229",
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            system=system,
            messages=msgs
        ) as stream:
            async for text in stream.text_stream:
                yield text


class GroqProvider(OpenAIProvider):
    """Provedor para Groq (que usa compatibilidade 1:1 com OpenAI SDK)"""
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        try:
            import openai
            # Groq override
            self.client = openai.AsyncOpenAI(
                api_key=self.config.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            # Default model handling para Groq
            if not self.config.model:
                self.config.model = "mixtral-8x7b-32768"
        except BaseException as e:
            raise e

class LlamaProvider(OpenAIProvider):
    """Provedor genérico para rodar Llama via vLLM, Ollama (API compativel) ou Together AI"""
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        try:
            import openai
            # Exemplo via base URL customizada
            base_url = self.config.extra_kwargs.get("base_url", "http://localhost:11434/v1")
            self.client = openai.AsyncOpenAI(
                api_key=self.config.api_key or "sk-no-key-required",
                base_url=base_url
            )
            if not self.config.model:
                self.config.model = "llama3"
        except BaseException as e:
            raise e
