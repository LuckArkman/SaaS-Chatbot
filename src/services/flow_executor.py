from typing import Any, Dict, List, Optional
from src.schemas.flow import FlowDefinition, FlowNode, NodeType
from src.models.mongo.flow import SessionStateDocument
from src.services.flow_interpreter import FlowGraph
from src.services.node_actions import NodeActions
from src.services.session_service import SessionService
from loguru import logger

class FlowExecutor:
    """
    Motor Principal de Execução de Fluxo.
    Responsável por transitar entre nodes e disparar as ações corretas.
    Replicando o motor central do FlowEngine C#.
    """
    def __init__(self, definition: FlowDefinition):
        self.graph = FlowGraph(definition)

    async def run_step(self, session: SessionStateDocument, user_input: Optional[str] = None):
        """
        Executa o próximo passo do fluxo baseado no estado atual da sessão.
        """
        current_node_id = session.current_node_id
        
        # 1. Trata input do usuário se estivermos em um QuestionNode / Input
        if user_input and current_node_id:
            node = self.graph.nodes.get(current_node_id)
            if node and node.type == NodeType.MESSAGE:
                # Se o nó anterior disparou uma pergunta, salvamos na variável
                var_name = node.data.get("variable_name")
                if var_name:
                    await SessionService.set_variable(session, var_name, user_input)
                    logger.debug(f"📝 Variável '{var_name}' capturada: {user_input}")

        # 2. Busca o Próximo Nó
        next_node = self.graph.get_next_node(current_node_id)
        
        if not next_node:
            logger.info(f"🏁 Fluxo finalizado para {session.contact_phone}")
            session.is_completed = True
            await SessionService.update_session(session)
            return

        # 3. Executa a Ação do Nó
        logger.info(f"⚡ Executando Nó: {next_node.id} ({next_node.type})")
        
        if next_node.type == NodeType.MESSAGE:
            await NodeActions.execute_message_node(
                next_node, session.tenant_id, session.contact_phone, session.variables
            )
        
        elif next_node.type == NodeType.AI:
            # TODO: Integrar com LangChain/OpenAI na Sprint 20
            logger.info("🧠 Cérebro IA aguardando integração...")
            
        elif next_node.type == NodeType.HANDOVER:
            await NodeActions.execute_handover_node(session.tenant_id, session.contact_phone)
            session.is_human_support = True
            session.is_completed = False
            logger.info(f"👥 Handover realizado para {session.contact_phone}. Fluxo pausado para suporte humano.")
            
        elif next_node.type == NodeType.CONDITION:
            # Lógica de Branching
            pass
            
        elif next_node.type == NodeType.AB_SPLIT:
            # 🟢 Sistema de Teste AB (Sprint 40)
            import random
            choice = random.choice(["A", "B"])
            logger.info(f"📊 A/B Testing: Contato {session.contact_phone} sorteado para Versão {choice}")
            
            # Aqui 'criteria' deve mapear para o ID do nó subsequente (A ou B)
            # Para simplificar: targets[0] = A, targets[1] = B
            targets = self.graph.adj.get(next_node.id, [])
            if len(targets) >= 2:
                next_id = targets[0] if choice == "A" else targets[1]
                next_node = self.graph.nodes.get(next_id)
            
            logger.info(f"⚡ Prosseguindo para variante: {next_node.id}")

        # 4. Atualiza Estado da Sessão e Persiste
        session.current_node_id = next_node.id
        await SessionService.update_session(session)
        
        # 🎯 Recursividade para nós que não esperam retorno do usuário
        # Se for um nó de mensagem pura e não tiver input configurado, avança
        if next_node.type == NodeType.MESSAGE and not next_node.data.get("expect_input"):
            await self.run_step(session)
