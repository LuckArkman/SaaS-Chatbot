# Sprint 13: Filtros de Mensagens e Normalização de Payload

**Tema**: Normalização de Dados.
**Objetivo**: Transformar qualquer mensagem de canal no formato `UnifiedMessage` do projeto.

## 📋 Checklist de Migração

### 1. Esquema de Mensagem Unificada

- [x] Implementar classe `UnifiedMessage` no diretório `/src/common` (Implementado em src/common/schemas.py)
- [x] Definir mapeamento de canais (Ex: `WhatsApp -> UnifiedMessage` implementado em src/services/message_normalizer.py)

### 2. Sanitização Base

- [x] Remover caracteres especiais indesejados e normalizar quebras de linha (Método 'sanitize_content' ativo)
- [x] Detectar intenções básicas via palavras-chave (Pré-processamento via metadados implementado)

### 3. Enriquecimento de Dados

- [x] Anexar `TenantId` à mensagem antes de enviá-la ao barramento assíncrono (Processado via middleware e anexado ao objeto)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
