# Sprint 08: Abstração de RabbitMQ (Service Bus) em Python

**Tema**: Arquitetura Event-Driven.
**Objetivo**: Criar a ponte de comunicação assíncrona entre microserviços.

## 📋 Checklist de Migração

### 1. Conector aio-pika
- [ ] Implementar conexão persistente com RabbitMQ
- [ ] Criar lógica de reconexão automática (Resiliência)

### 2. Publicação de Eventos
- [ ] Implementar `ServiceBusPublisher` para enviar mensagens para Exchanges do tipo Topic

### 3. Consumo de Eventos (Background Tasks)
- [ ] Implementar `BaseConsumer` assíncrono para escutar filas
- [ ] Validar serialização/deserialização JSON (Pydantic Integration)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
