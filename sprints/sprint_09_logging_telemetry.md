# Sprint 09: Logger Centralizado e Telemetria

**Tema**: Observabilidade.
**Objetivo**: Padronizar logs estruturados (JSON) para fácil análise posterior.

## 📋 Checklist de Migração

### 1. Configuração de Logging (Loguru)
- [x] Definir formatos de log: `TIMESTAMP | LEVEL | TENANT_ID | USER_ID | MESSAGE` (Loguru configurado)
- [x] Configurar rotação de arquivos de log no disco da VPS (Log estruturado JSON ativo)

### 2. Request Tracing
- [x] Gerar e propagar `CorrelationId` entre as chamadas (LoggingMiddleware implementado)

### 3. Health Checks
- [x] Criar endpoint `/health` que testa conexões com Postgres, Redis e RabbitMQ (Implementado em main.py)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
