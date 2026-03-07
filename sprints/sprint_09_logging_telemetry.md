# Sprint 09: Logger Centralizado e Telemetria

**Tema**: Observabilidade.
**Objetivo**: Padronizar logs estruturados (JSON) para fácil análise posterior.

## 📋 Checklist de Migração

### 1. Configuração de Logging (Loguru ou Standard)
- [ ] Definir formatos de log: `TIMESTAMP | LEVEL | TENANT_ID | USER_ID | MESSAGE`
- [ ] Configurar rotação de arquivos de log no disco da VPS

### 2. Request Tracing
- [ ] Gerar e propagar `CorrelationId` entre as chamadas (Header -> API -> Bus)

### 3. Health Checks
- [ ] Criar endpoint `/health` que testa conexões com Postgres, Redis e RabbitMQ

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
