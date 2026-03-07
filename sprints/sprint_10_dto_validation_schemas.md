# Sprint 10: Validação de DTOs com Pydantic e Schemas Base

**Tema**: Integridade de Dados.
**Objetivo**: Centralizar as regras de validação que no .NET ficavam em `FluentValidation` ou no `ModelState`.

## 📋 Checklist de Migração

### 1. Modelos Pydantic V2
- [ ] Implementar Schemas genéricos de Resposta (Pagination, SingleResult)
- [ ] Criar validadores customizados para campos complexos (WhatsApp Phones, URLs)

### 2. Filtros de Pesquisa
- [ ] Implementar Classe Base para filtros OData-like (search, sort, limit)

### 3. Mapeadores (AutoMapper style)
- [ ] Definir convenção de conversão de Entidades SQLAlchemy -> Schemas Pydantic

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
