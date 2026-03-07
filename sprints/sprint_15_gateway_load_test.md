# Sprint 15: Testes de Stress do Gateway

**Tema**: Estabilidade sob Carga.
**Objetivo**: Garantir que o Gateway suporte milhares de mensagens simultâneas.

## 📋 Checklist de Migração

### 1. Testes de Mock Canal
- [ ] Criar script de bombardeio de mensagens para os endpoints do Gateway
- [ ] Monitorar tempo de fila no Celery/RabbitMQ

### 2. Ajustes de Concorrência
- [ ] Tunear número de workers e conexões pool do Postgres
- [ ] Validar comportamento em cenários de rede instável na VPS

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
