# Sprint 27: Gerenciamento de QR Code via API Python

**Tema**: Autenticação de Canal.
**Objetivo**: Exibir o QR Code do WhatsApp no Frontend a partir do sinal gerado pelo bot.

## 📋 Checklist de Migração

### 1. Streaming de QR Code
- [ ] Implementar rota que repassa o Base64/Image do QR Code gerado pelo Venom para o UI
- [ ] Usar WebSockets para notificar o UI quando o QR Code mudar ou for "escaneado"

### 2. Timeout & Expiração
- [ ] Tratar expirações de sessão de pareamento e solicitar novo QR Code automaticamente

### 3. Persistent Sessions
- [ ] Salvar caminhos de tokens de sessão para evitar reconexão frequente

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
