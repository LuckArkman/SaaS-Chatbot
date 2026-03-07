# Sprint 12: Webhooks de Integração para WhatsApp

**Tema**: Conectividade com Provider.
**Objetivo**: Processar os pacotes JSON específicos do WhatsApp (Venom/Evolution).

## 📋 Checklist de Migração

### 1. Parser de Payloads WhatsApp
- [ ] Criar Pydantic Schemas para os diferentes eventos: `chat`, `presence`, `ack`, `status`
- [ ] Implementar tratamento de arquivos de mídia (Audio/Image/Video) para armazenamento temporário

### 2. Validação e Descarte
- [ ] Ignorar mensagens de sistema ou de grupos (se configurado) para reduzir carga no Flow Engine

### 3. Notificação de Status
- [ ] Propagar eventos de `MessageDelivered` e `MessageRead` de volta no RabbitMQ

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
