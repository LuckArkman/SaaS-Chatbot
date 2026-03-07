# Sprint 06: Desenvolvimento do Middleware de Tratamento de Erros

**Tema**: Estabilidade e Resiliência Global.
**Objetivo**: Padronizar as respostas de erro em JSON, assim como o `ExceptionMiddleware` do .NET.

## 📋 Checklist de Migração

### 1. Custom Exceptions
- [x] Criar hierarquia de exceções (`AppException`, `ValidationException`, `NotFoundException`)
- [x] Definir códigos internos de erro compatíveis com o Frontend existente

### 2. Exception Handler (FastAPI)
- [x] Registrar handlers globais para capturar exceções não tratadas
- [x] Formatar o retorno seguindo o padrão: `{ "success": false, "error": { "message": "...", "code": 102 } }`

### 3. Logging de Erros
- [x] Integrar logs detalhados do `traceback` no console/logs internos em caso de HTTP 500

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
