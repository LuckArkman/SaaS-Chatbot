# Sprint 13: Filtros de Mensagens e Normalização de Payload

**Tema**: Normalização de Dados.
**Objetivo**: Transformar qualquer mensagem de canal no formato `UnifiedMessage` do projeto.

## 📋 Checklist de Migração

### 1. Esquema de Mensagem Unificada
- [ ] Implementar classe `UnifiedMessage` no diretório `/src/common`
- [ ] Definir mapeamento de canais (Ex: `WhatsApp -> UnifiedMessage`, `Instagram -> UnifiedMessage`)

### 2. Sanitização Base
- [ ] Remover caracteres especiais indesejados e normalizar quebras de linha
- [ ] Detectar intenções básicas via palavras-chave (Pré-processamento rápido)

### 3. Enriquecimento de Dados
- [ ] Anexar `TenantId` e `AccountId` à mensagem antes de enviá-la ao barramento assíncrono

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
