# Sprint 37: Importação de Contatos e Listas de Segmentação

**Tema**: Gestão de Leads.
**Objetivo**: Oferecer ferramentas para organizar quem receberá as mensagens.

## 📋 Checklist de Migração

### 1. CSV/Excel Importer
- [x] Implementar parser assíncrono para planilhas (Parser em src/services/contact_service.py pronto)
- [x] Validar e normalizar números (Método 'normalize_phone' robusto em Python)
- [x] Endpoint de upload funcional (POST /contacts/import)

### 2. Tags e Filtros
- [x] Criar sistema de marcação (Tabela 'tags' e 'contact_tags_assoc' prontas)
- [x] Listagem e associação de tags integrada na API

### 3. Blacklist (Opt-out)
- [x] Gestão de Opt-out persistida no Postgres (Flag 'is_blacklisted' no modelo Contact)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
