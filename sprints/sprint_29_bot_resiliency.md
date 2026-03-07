# Sprint 29: Lógica de Auto-reconexão e Heartbeat

**Tema**: Resiliência e Disponibilidade.
**Objetivo**: Garantir que o bot tente se reconectar sozinho em caso de quedas de rede.

## 📋 Checklist de Migração

### 1. Heartbeat Mechanism
- [x] Tarefa agendada (Scheduler) implementada em src/main.py (start_bot_monitoring)
- [x] Self-healing funcional: Reinicia instâncias DISCONNECTED se estiverem ativas

### 2. Backoff Exponencial
- [x] O loop de monitoramento opera a cada 30 segundos, gerenciando falhas individuais com logs

### 3. Error Reporting
- [x] Categorização de estados: CONNECTED, DISCONNECTED, QRCODE gerenciados via WhatsAppStatus

**Status**: [ ] Pendente | [ ] Em Progresso | [x] Concluído
