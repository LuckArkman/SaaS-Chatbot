# Sprint 11: Migração do Channel Gateway (Core)

**Tema**: Gateway de Entrada de Dados.
**Objetivo**: Receber as mensagens brutas dos canais (WhatsApp/Bot) e encaminhá-las para processamento.

## 📋 Checklist de Migração

### 1. Roteador de Webhooks
- [ ] Implementar endpoint genérico de recebimento de mensagens
- [ ] Adicionar segurança via `ApiKey` ou `Signature` para validação da origem

### 2. Integração Celery/Redis
- [ ] Criar fila de `IncomingMessages` no Redis para processamento assíncrono
- [ ] Implementar lógica de persistência inicial no Postgres (Auditoria de Entrada)

### 3. Paridade Funcional
- [ ] Validar compatibilidade com o serviço `SaaS.OmniChannelPlatform.Services.ChannelGateway` atual.

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
