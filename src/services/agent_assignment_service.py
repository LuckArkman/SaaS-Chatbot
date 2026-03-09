from sqlalchemy.orm import Session
from src.models.user import User
from src.models.chat import Conversation
from src.core.redis import redis_client
from loguru import logger
from typing import Optional

class AgentAssignmentService:
    """
    Motor de distribuição automática de chats (Round-Robin).
    Substitui a lógica de 'AgentDispatch' do .NET.
    """
    @staticmethod
    async def assign_agent(db: Session, conversation: Conversation) -> Optional[User]:
        """
        Encontra o melhor agente disponível e atribui à conversa.
        Critérios: Online no Redis, IsAgent=True, Abaixo da capacidade máxima.
        """
        tenant_id = conversation.tenant_id
        
        # 1. Busca todos os agentes do Tenant
        query = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.is_agent == True,
            User.is_active == True
        )
        
        # Filtra por Departamento se estiver definido (Sprint 25)
        if conversation.department_id:
            from src.models.department import agent_department
            query = query.join(agent_department).filter(
                agent_department.c.department_id == conversation.department_id
            )
            
        agents = query.all()
        
        available_agents = []
        for agent in agents:
            # 2. Verifica se está online no Redis (Sprint 21)
            is_online = await redis_client.get(f"presence:{tenant_id}:{agent.id}")
            
            # 3. Verifica capacidade (Sprint 24)
            if is_online and agent.current_chats_count < agent.max_concurrent_chats:
                available_agents.append(agent)
                
        if not available_agents:
            logger.warning(f"⚠️ Ninguém disponível no Tenant {tenant_id} para atender {conversation.contact_phone}")
            return None
            
        # 4. Escolha por Menor Carga (Simple Round-Robin / Capacity Balanced)
        # Ordenamos por quem tem menos ordens no momento
        chosen_agent = sorted(available_agents, key=lambda a: a.current_chats_count)[0]
        
        # 5. Atribui e incrementa contador
        conversation.agent_id = chosen_agent.id
        chosen_agent.current_chats_count += 1
        db.commit()
        
        logger.info(f"👨‍💻 Chat {conversation.contact_phone} atribuído ao agente {chosen_agent.full_name}")
        return chosen_agent

    @staticmethod
    def transfer_chat(db: Session, conversation: Conversation, target_agent_id: int) -> bool:
        """Transfere manualmente o chat para outro agente."""
        new_agent = db.query(User).get(target_agent_id)
        if not new_agent or not new_agent.is_agent:
            return False
            
        # Libera antigo (opcional: se quiser manter histórico, pode ser auditado)
        if conversation.agent:
            conversation.agent.current_chats_count = max(0, conversation.agent.current_chats_count - 1)
            
        # Atribui novo
        conversation.agent_id = new_agent.id
        new_agent.current_chats_count += 1
        db.commit()
        
        logger.info(f"🔄 Chat transferido de {conversation.contact_phone} para {new_agent.full_name}")
        return True
