# Sprint 36: Agendador de Campanhas em Lote (Celery/Redis)

**Tema**: Mass Mailing / Automação de Massa.
**Objetivo**: Disparar milhares de mensagens sem travar o sistema.

## 📋 Checklist de Migração

### 1. Campaign Model
- [x] Criar tabelas de `Campaign` e `CampaignContact` (Modelagem completa em src/models/campaign.py)
- [x] Status: `DRAFT -> SCHEDULED -> SENDING -> COMPLETED` gerenciados pelo ciclo de vida do Worker

### 2. Celery Worker (Batch Dispatcher)
- [x] Implementar distribuição via RabbitMQ + Async Background Worker (CampaignWorker funcional)
- [x] Suporte a pausar/cancelar campanha em tempo real via Status Check no loop

### 3. Integração com Canal
- [x] Injetar mensagens na fila de `Outgoing` via WhatsApp Bridge Cadenciado

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
