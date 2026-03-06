# 💎 Guia de Implementação: Frontend Premium (Vue 3 + TypeScript)

Este documento detalha a arquitetura, ferramentas, padrões de design e lógica de negócio implementados no novo ecossistema visual da plataforma **SaaS OmniChannel**.

---

## 🚀 1. Stack Tecnológica & Ecossistema

A escolha das tecnologias foi focada em **performance extrema**, **tipagem estrita** e **estética de última geração**.

| Ferramenta | Finalidade | Justificativa |
| :--- | :--- | :--- |
| **Vue 3 (Composition API)** | Framework Global | Reatividade superior e melhor suporte a TypeScript via `<script setup>`. |
| **Vite** | Build Tool | Velocidade de desenvolvimento instantânea comparada ao Webpack. |
| **Pinia** | Store Management | O sucessor oficial do Vuex, modular e tipado por padrão. |
| **Vue Router 4** | Roteamento | Controle de acessos e guards de autenticação JWT. |
| **Axios** | Cliente HTTP | Interceptores globais para injeção de tokens e tratamento de erros 401. |
| **Tailwind CSS + PostCSS** | Estilização | Design system utilitário para garantir consistência visual e responsividade. |
| **Lucide Vue Next** | Iconografia | Ícones modernos, leves e consistentes. |
| **Vue Flow** | Builder de Agentes | Engine de alta performance para grafos e fluxos visuais. |
| **Headless UI** | Componentes | Componentes de UI acessíveis e totalmente customizáveis. |

---

## 🎨 2. Design System: Modern Glassmorphism

A interface segue uma estética **"Dark & Glass"** premium, inspirada em dashboards de alto nível como Linear e Vercel.

- **Fundo**: Slate-950 (Preto profunto com nuances de azul).
- **Cards**: `glass-card` (Fundo semitransparente com `backdrop-blur` e bordas sutis).
- **Tipografia**: **Inter**, focada em legibilidade e clareza de dados.
- **Micro-animações**: Transições de opacidade suaves entre rotas e efeitos de hover `active:scale-95`.

---

## 📂 3. Arquitetura de Pastas e Componentes

```text
SaaS.ChatUI/
├── src/
│   ├── api/                # Configuração do Axios e Interceptores
│   ├── assets/             # Imagens e vetores estáticos
│   ├── components/         # Componentes compartilhados (Botões, Inputs)
│   ├── layouts/            # Templates de página (Default, Auth)
│   ├── router/             # Definições de rotas e Guards de Segurança
│   ├── stores/             # Pinia stores (Auth, User, UI State)
│   ├── views/              # Páginas principais da aplicação
│   │   ├── auth/           # Login e Recuperação
│   │   ├── chat/           # Central de Atendimento Real-time
│   │   ├── flowbuilder/    # Editor de Agentes de Automação
│   │   ├── superadmin/     # Gestão global de Tenants
│   │   └── tenant/         # Dashboard do Cliente Final
│   └── index.css           # Camada global de Tailwind e Variáveis
├── tailwind.config.js      # Customização do Design System
├── tsconfig.json           # Configurações do compilador TypeScript
└── Dockerfile              # Build multi-stage otimizado
```

---

## ⚙️ 4. Scripts e Lógica Central

### 🛡️ Autenticação & Interceptores (`src/api/index.ts`)
O sistema possui um interceptor central que:
1. Extrai o token do `localStorage` em cada requisição.
2. Monitora erros `401`. Se o token expirar, ele limpa o estado e redireciona para o login instantaneamente.

### 🗺️ Roteamento Seguro (`src/router/index.ts`)
As rotas são protegidas por metadados:
- `requiresAuth: true`: Impede acesso sem token.
- `role: 'SuperAdmin'`: (Opcional) Filtra visualizações baseadas no perfil do usuário.

### 🌿 Builder de Fluxos (`src/views/flowbuilder/Builder.vue`)
Utiliza o `Vue Flow` para permitir que o usuário:
- **Arraste e Solte**: Nós de mensagem, IA e transbordo.
- **Conecte Lógicas**: Visualização clara de como o bot se comporta.
- **Salvamento Automático**: Debounce de requisições para a API de FlowEngine.

---

## 💬 5. Chat Hub & SignalR

A visão de chat (`ChatHub.vue`) foi desenhada para ser o coração da operação:
- **Sidebar de Contatos**: Filtragem rápida e status online/offline.
- **Área de Mensagens**: Bubble design adaptativo com suporte a temas.
- **Contexto do Contato**: Visualização lateral de tags e telefone do Lead.

---

## 🏗️ 6. Infraestrutura Docker (Deploy)

O `Dockerfile` utiliza uma estratégia de duas etapas para garantir que a imagem final seja o menor possível (aprox. 20MB):

1. **Build Stage (Node 20)**: Compila o projeto TypeScript em arquivos JS minificados.
2. **Production Stage (Nginx Alpine)**: Serve apenas os arquivos estáticos, otimizando o consumo de RAM na VPS.

---

## 🛠️ 7. Comandos Úteis de Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento (HMR ativo)
npm run dev

# Gerar build de produção
npm run build

# Validar tipos TypeScript
npm run type-check
```

---

> [!IMPORTANT]
> **Integração com Backend**: Todas as chamadas apontam para o Identity Gateway (Porta 5051). Certifique-se de que o container de Identidade está rodando antes de testar fluxos de dados reais.

---
**Desenvolvido por Antigravity AI** 🚀
