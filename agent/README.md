# 🤖 AI Agent Module

Este módulo implementa uma interface unificada, assíncrona e orientada a objetos para gerenciar o Agente de IA. Ele encapsula provedores populares para orquestração de resposta do LLM e gerenciamento do contexto de mensagens (memória).

## 🚀 Provedores Suportados (Modelos LLMs)
- **ChatGPT (OpenAI)** via `openai`
- **Google Gemini** via `google-generativeai`
- **Claude (Anthropic)** via `anthropic`
- **Groq** via `openai` (compatibilidade 1:1)
- **Llama** (genérico, para inferências locais via Ollama/vLLM ou Cloud hospedada tipo Together) via `openai`

## 📦 Dependências
Para o funcionamento dos provedores que deseja usar, instale as libs correspondentes:
```bash
pip install openai "google-generativeai" anthropic pydantic
```

## 🛠 Exemplos de Uso

### **1. Inicializando e usando o Google Gemini**
```python
import asyncio
from agent import AIAgent, AgentConfig

async def main():
    config = AgentConfig(
        provider="gemini",
        model="gemini-pro",
        api_key="SUA_API_KEY_GOOGLE",
        system_prompt="Você é o assistente inteligente da plataforma SaaS-Chatbot."
    )
    
    agent = AIAgent(config)
    
    # Bate-papo normal (aguarda toda a resposta)
    reply = await agent.chat("Como você pode me ajudar a vender mais?")
    print("Agent:", reply)

if __name__ == "__main__":
    asyncio.run(main())
```

### **2. Usando Groq (Modelos ultra-rápidos como LLaMA 3 e Mixtral)**
```python
import asyncio
from agent import AIAgent, AgentConfig

async def main():
    config = AgentConfig(
        provider="groq",
        model="mixtral-8x7b-32768", # ou llama3-70b-8192
        api_key="SUA_API_KEY_GROQ",
        temperature=0.8
    )
    
    agent = AIAgent(config)
    
    # Streaming de conteúdo iterativo
    print("Agent: ", end="")
    async for chunk in agent.chat_stream("Explique a teoria da relatividade em 1 frase."):
        print(chunk, end="", flush=True)
    print()

if __name__ == "__main__":
    asyncio.run(main())
```

### **Arquitetura**
- `models.py`: Modelos em Pydantic para padronizar `AgentConfig` e a estrutura das `Message`.
- `memory.py`: Componente `MemoryManager` acoplado ao agente, para empilhar o contexto histórico e ejetar `system_prompt` caso a memória seja limpada em novas sessões.
- `providers.py`: O "Miolo" da inteligência artificial. Abstrai a diferença dolorosa entre diferentes SDKs oficiais em apenas dois métodos assíncronos (`generate_response` e `stream_response`).
- `core.py`: Orquestrador final que gerencia memória e invoca provedores em uníssono.
