# Sprint 12: Webhooks de Integração para WhatsApp

**Tema**: Conectividade com Provider.
**Objetivo**: Processar os pacotes JSON específicos do WhatsApp (Venom/Evolution).

## 📋 Checklist de Migração

### 1. Parser de Payloads WhatsApp
- [x] Criar Pydantic Schemas para os diferentes eventos: `chat`, `presence`, `ack`, `status` (Implementado em src/schemas/whatsapp.py)
- [x] Implementar tratamento de arquivos de mídia (Audio/Image/Video) para armazenamento temporário (Identificado via 'isMedia' no payload)

### 2. Validação e Descarte
- [x] Ignorar mensagens de sistema ou de grupos (se configurado) para reduzir carga no Flow Engine (Filtro 'isGroupMsg' e 'status@broadcast' ativo)

### 3. Notificação de Status
- [x] Propagar eventos de `MessageDelivered` e `MessageRead` de volta no RabbitMQ (Encaminhado para routing key 'message.ack')

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
