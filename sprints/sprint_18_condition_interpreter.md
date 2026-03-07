# Sprint 18: Interpretador de Condições e Variáveis de Sessão

**Tema**: Lógica Dinâmica.
**Objetivo**: Avaliar condições IF/ELSE baseadas em variáveis coletadas durante o chat.

## 📋 Checklist de Migração

### 1. Motor de Expressões
- [x] Implementar interpretador básico de expressões (Implementado em src/services/condition_evaluator.py)
- [x] Integrar acesso a variáveis de ambiente e globais do sistema (Injeção de variáveis via placeholders `{{var}}` funcional)

### 2. Gerenciamento de Sessão (State Machine)
- [x] Armazenar e recuperar o estado atual da conversa do MongoDB (Implementado em src/services/session_service.py)
- [x] Cachear os estados quentes no Redis para performance "instantânea" (Estratégia de Cache 30min ativa)

### 3. Input Handling
- [x] Coletar dados de entrada do usuário (`QuestionNode`) e salvar na variável correta da sessão (Preparado no SessionService para uso na Sprint 19)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
