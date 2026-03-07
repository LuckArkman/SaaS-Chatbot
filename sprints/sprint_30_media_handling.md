# Sprint 30: Envio de Mídias e Arquivos (Python/FastAPI Storage)

**Tema**: Multimídia.
**Objetivo**: Gerenciar o upload e download de imagens, vídeos e áudios que passam pelo sistema.

## 📋 Checklist de Migração

### 1. Storage Provider
- [ ] Implementar interface de armazenamento local em disco (VPS)
- [ ] Configurar `/uploads` como serve estático protegido por autenticação

### 2. File Processing
- [ ] Gerar thumbs de imagens para visualização rápida no painel de chat
- [ ] Converter formatos de áudio (se necessário) para compatibilidade com o player do navegador

### 3. Security
- [ ] Impedir upload de tipos de arquivos perigosos e limitar tamanho por Tenant

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
