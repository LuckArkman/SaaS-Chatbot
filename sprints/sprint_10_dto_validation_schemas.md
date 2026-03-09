# Sprint 10: Validação de DTOs com Pydantic e Schemas Base

**Tema**: Integridade de Dados.
**Objetivo**: Centralizar as regras de validação que no .NET ficavam em `FluentValidation` ou no `ModelState`.

## 📋 Checklist de Migração

### 1. Modelos Pydantic V2
- [x] Implementar Schemas genéricos de Resposta (BaseResponse, PagedResponse implementados em src/schemas/base.py)
- [x] Criar validadores customizados para campos complexos (WhatsAppPhone implementado em src/schemas/common.py)

### 2. Filtros de Pesquisa
- [x] Implementar Classe Base para filtros OData-like (FilterParams implementado em src/schemas/filters.py)

### 3. Mapeadores (AutoMapper style)
- [x] Definir convenção de conversão de Entidades SQLAlchemy -> Schemas Pydantic (Uso de 'from_attributes = True' no User schema)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
