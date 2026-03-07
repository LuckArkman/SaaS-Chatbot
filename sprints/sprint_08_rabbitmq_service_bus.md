# Sprint 08: Abstração de RabbitMQ (Service Bus) em Python

**Tema**: Arquitetura Event-Driven.
**Objetivo**: Criar a ponte de comunicação assíncrona entre microserviços.

## 📋 Checklist de Migração

### 1. Conector aio-pika
- [x] Implementar conexão persistente com RabbitMQ (Conexão robusta implementada)
- [x] Criar lógica de reconexão automática (Resiliência nativa do aio-pika)

### 2. Publicação de Eventos
- [x] Implementar `ServiceBusPublisher` para enviar mensagens para Exchanges do tipo Topic

### 3. Consumo de Eventos (Background Tasks)
- [x] Implementar `BaseConsumer` assíncrono para escutar filas (Método `subscribe` implementado)
- [x] Validar serialização/deserialização JSON (Integrado no Core Bus)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
