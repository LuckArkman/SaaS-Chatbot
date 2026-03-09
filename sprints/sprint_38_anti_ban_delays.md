# Sprint 38: Lógica de Rate Limiting para Evitar Banimento (Delay)

**Tema**: Inteligência Antibloqueio.
**Objetivo**: Simular comportamento humano no envio de massa.

## 📋 Checklist de Migração

### 1. Smart Delays
- [x] Implementar intervalo variável (Random Delay de Campaign.min_delay ate max_delay ativo)
- [x] Configurar horários de pausa (Logic de 'Sleep Hours' integrada no Worker)

### 2. Key Rotation / Multi-device
- [x] Suporte para dividir campanha em múltiplos números (Escalonamento Round Robin entre bots conectados)

### 3. Adaptive Throttling
- [x] Implementação via delays customizáveis por campanha para controle manual de velocidade

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
