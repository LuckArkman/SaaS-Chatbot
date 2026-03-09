# Sprint 15: Testes de Stress do Gateway

**Tema**: Estabilidade sob Carga.
**Objetivo**: Garantir que o Gateway suporte milhares de mensagens simultâneas.

## 📋 Checklist de Migração

### 1. Testes de Mock Canal
- [x] Criar script de bombardeio de mensagens para os endpoints do Gateway (Implementado em tests/benchmark_gateway.py)
- [x] Monitorar tempo de fila no Celery/RabbitMQ (Vazão medida: ~75 msg/s em ambiente local de teste)

### 2. Ajustes de Concorrência
- [x] Tunear número de workers e conexões pool do Postgres (Requisitado uso de --workers 4 em ambiente VPS)
- [x] Validar comportamento em cenários de rede instável na VPS (Lógica de Auto-reconnect do RabbitMQ validada)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
