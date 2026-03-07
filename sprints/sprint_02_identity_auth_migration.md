# Sprint 02: Migração do Core de Autenticação (JWT/Identity)

**Tema**: Segurança e Controle de Acesso Baseado em Claims.
**Objetivo**: Replicar a segurança robusta do ASP.NET Identity em FastAPI.

## 📋 Checklist de Migração

### 1. Modelagem de Segurança
- [x] Criar modelos Pydantic para `User`, `Role` e `Claims`
- [x] Implementar hashing de senhas usando `passlib[bcrypt]`
- [x] Migrar lógica de autenticação do Postgres (`IdentityDbContext`)

### 2. JWT & Tokens
- [x] Implementar geração de Access Tokens e Refresh Tokens
- [x] Criar dependência `get_current_user` para proteção de rotas
- [x] Implementar lógica de expiração e invalidação de tokens

### 3. Integração FastAPI
- [x] Configurar `OAuth2PasswordBearer`
- [x] Criar endpoints `/auth/login` e `/auth/refresh`

## 🏗️ Mapeamento .NET -> Python

| .NET | Python / FastAPI |
| :--- | :--- |
| `UserManager<TUser>` | `CRUDUser` Service (SQLAlchemy) |
| `SignInManager` | Funções de validação de senha no Service |
| `Authorize` Attribute | FastAPI Dependencies (`Security`, `Depends`) |
| `ClaimsPrincipal` | DTO `CurrentUser` injetado na rota |

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
