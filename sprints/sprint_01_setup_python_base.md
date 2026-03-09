# Sprint 01: Setup do Ambiente Base Python e CI/CD

**Tema**: Inicialização do Ecossistema Python e Estrutura de Microserviços.
**Objetivo**: Estabelecer a base sólida para o desenvolvimento dos novos serviços.

## 📋 Checklist de Migração

### 1. Configuração do Projeto
- [x] Criar ambiente virtual (`venv` ou `poetry`)
- [x] Definir arquivo `requirements.txt` ou `pyproject.toml` base
- [x] Configurar `.env` base (replicando variáveis do .NET)
- [x] Criar estrutura de pastas `/src/common` para Building Blocks

### 2. Base do Microserviço (FastAPI)
- [x] Implementar classe `BaseApplication` (equivalente ao `Program.cs`)
- [x] Configurar Injeção de Dependência (Injetado via Depends nativo)
- [x] Configurar suporte a CORS e Middlewares de Segurança

### 3. Docker & Local Dev
- [x] Criar `Dockerfile` multi-stage para Python
- [x] Atualizar `docker-compose.yml` para apontar para os novos serviços Python (em paralelo ou gradual)

## 🏗️ Mapeamento .NET -> Python (Exemplos)

| Conceito .NET | Equivalente em Python (FastAPI) |
| :--- | :--- |
| `Program.cs / Startup.cs` | `main.py` + `FastAPI()` instance |
| `appsettings.json` | `.env` + `pydantic-settings` |
| `Controllers` | `Routers` (`APIRouter`) |
| `Middlewares` | `Request Middleware` |
| `NuGet Packages` | `Pip / PyPI Packages` |

## 📦 Scripts de Sprint
- `src/main.py`: Ponto de entrada.
- `src/core/config.py`: Gestão de configurações.
- `src/core/dependencies.py`: Gestão de dependências.

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
