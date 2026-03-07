# Sprint 36: Agendador de Campanhas em Lote (Celery/Redis)

**Tema**: Mass Mailing / Automação de Massa.
**Objetivo**: Disparar milhares de mensagens sem travar o sistema.

## 📋 Checklist de Migração

### 1. Campaign Model
- [ ] Criar tabelas de `Campaign` e `CampaignSchedule`
- [ ] Status: `DRAFT -> SCHEDULED -> SENDING -> COMPLETED`

### 2. Celery Worker (Batch Dispatcher)
- [ ] Implementar distribuição de carga de disparo para evitar gargalo
- [ ] Suporte a pausar/cancelar campanha em tempo real

### 3. Integração com Canal
- [ ] Injetar mensagens na fila de `Outgoing` do bot de forma cadenciada

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
