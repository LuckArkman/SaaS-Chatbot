# Sprint 18: Interpretador de Condições e Variáveis de Sessão

**Tema**: Lógica Dinâmica.
**Objetivo**: Avaliar condições IF/ELSE baseadas em variáveis coletadas durante o chat.

## 📋 Checklist de Migração

### 1. Motor de Expressões
- [ ] Implementar interpretador básico de expressões (Ex: `{{user.name}} == "Teste"`)
- [ ] Integrar acesso a variáveis de ambiente e globais do sistema

### 2. Gerenciamento de Sessão (State Machine)
- [ ] Armazenar e recuperar o estado atual da conversa do MongoDB em cada interação
- [ ] Cachear os estados quentes no Redis para performance "instantânea"

### 3. Input Handling
- [ ] Coletar dados de entrada do usuário (`QuestionNode`) e salvar na variável correta da sessão

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
