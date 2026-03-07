# Sprint 27: Gerenciamento de QR Code via API Python

**Tema**: Autenticação de Canal.
**Objetivo**: Exibir o QR Code do WhatsApp no Frontend a partir do sinal gerado pelo bot.

## 📋 Checklist de Migração

### 1. Streaming de QR Code
- [x] Streaming de QR Code via WebSocket (Implementado envio de 'bot_qrcode_update')
- [x] Notificação de mudança de status (CONNECTED, DISCONNECTED, etc) pronta

### 2. Timeout & Expiração
- [x] Detecção de status através do Health Monitor (Diferencia status 'qrcode' de 'connected' automaticamente)

### 3. Persistent Sessions
- [x] Mapeamento de instâncias persistentes no Banco de Dados (Postgres armazena o estado da última sessão)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
