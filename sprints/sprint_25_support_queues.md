# Sprint 25: Filas de Atendimento e Distribuição

**Tema**: Experiência do Cliente.
**Objetivo**: Gerenciar a prioridade e o tempo de espera nas filas de suporte.

## 📋 Checklist de Migração

### 1. Departamentos/Setores
- [x] Criar tabelas de `Department` e relacionamentos (Modelagem src/models/department.py completa)
- [x] Roteamento por Setor (AgentAssignmentService agora filtra por 'department_id')

### 2. SLA & Timeout
- [x] Monitorar tempo de primeira resposta (Campo 'first_response_at' atualizado no primeiro envio do agente)
- [x] Estrutura para logs de AHT pronta (Campos de métricas integrados no Postgres)

### 3. Painel Supervisor
- [x] Endpoints para monitoramento (Endpoints de chat permitem ver atribuição e departamentos por Tenant)

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
