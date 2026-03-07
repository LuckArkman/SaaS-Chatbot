# Sprint 02: Migração do Core de Autenticação (JWT/Identity)

**Tema**: Segurança e Controle de Acesso Baseado em Claims.
**Objetivo**: Replicar a segurança robusta do ASP.NET Identity em FastAPI.

## 📋 Checklist de Migração

### 1. Modelagem de Segurança
- [ ] Criar modelos Pydantic para `User`, `Role` e `Claims`
- [ ] Implementar hashing de senhas usando `passlib[bcrypt]`
- [ ] Migrar lógica de autenticação do Postgres (`IdentityDbContext`)

### 2. JWT & Tokens
- [ ] Implementar geração de Access Tokens e Refresh Tokens
- [ ] Criar dependência `get_current_user` para proteção de rotas
- [ ] Implementar lógica de expiração e invalidação de tokens

### 3. Integração FastAPI
- [ ] Configurar `OAuth2PasswordBearer`
- [ ] Criar endpoints `/auth/login` e `/auth/refresh`

## 🏗️ Mapeamento .NET -> Python

| .NET | Python / FastAPI |
| :--- | :--- |
| `UserManager<TUser>` | `CRUDUser` Service (SQLAlchemy) |
| `SignInManager` | Funções de validação de senha no Service |
| `Authorize` Attribute | FastAPI Dependencies (`Security`, `Depends`) |
| `ClaimsPrincipal` | DTO `CurrentUser` injetado na rota |

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
