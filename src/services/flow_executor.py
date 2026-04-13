from typing import Any, Dict, List, Optional
from src.schemas.flow import FlowDefinition, FlowNode, NodeType
from src.models.mongo.flow import SessionStateDocument
from src.services.flow_interpreter import FlowGraph
from src.services.node_actions import NodeActions
from src.services.session_service import SessionService
from loguru import logger
import random

# Limite de segurança para sequencias automaticas de nos sem input do usuario.
# Evita loops infinitos em fluxos mal configurados (ex: ciclos de MESSAGE sem expect_input).
MAX_AUTO_STEPS = 50

class FlowExecutor:
    """
    Motor Principal de Execucao de Fluxo.
    Responsavel por transitar entre nodes e disparar as acoes corretas.
    Replicando o motor central do FlowEngine C#.

    CORRECAO BUG #6: A recursao ilimitada em run_step foi convertida em loop
    iterativo com limite de seguranca (MAX_AUTO_STEPS). A recursao anterior podia
    causar RecursionError ou stack overflow em fluxos com multiplos nos de
    mensagem em sequencia sem expect_input.
    """
    def __init__(self, definition: FlowDefinition):
        self.graph = FlowGraph(definition)

    async def run_step(self, session: SessionStateDocument, user_input: Optional[str] = None):
        """
        Executa o proximo passo do fluxo baseado no estado atual da sessao.

        Loop iterativo: avanca automaticamente por nos que nao esperam input do
        usuario (ex: sequencia de mensagens de boas-vindas), parando ao encontrar
        um no com expect_input=True, HANDOVER, fim do fluxo, ou apos MAX_AUTO_STEPS.
        """
        current_node_id = session.current_node_id
        auto_steps = 0   # Contador de seguranca contra loops infinitos

        # ── Paso 0: Captura de variavel do no atual (antes de avancar) ────────
        # Se o no atual estava aguardando input, salva a resposta do usuario.
        if user_input and current_node_id:
            node = self.graph.nodes.get(current_node_id)
            if node and node.type == NodeType.MESSAGE:
                var_name = node.data.get("variable_name")
                if var_name:
                    await SessionService.set_variable(session, var_name, user_input)
                    logger.debug(f"📝 Variável '{var_name}' capturada: {user_input}")

        # ── Loop principal de execucao ────────────────────────────────────────
        while True:
            auto_steps += 1
            if auto_steps > MAX_AUTO_STEPS:
                logger.error(
                    f"🔴 [FlowExecutor] Limite de {MAX_AUTO_STEPS} passos automaticos atingido "
                    f"para {session.contact_phone}. Fluxo possivelmente ciclico — abortando."
                )
                session.is_completed = True
                await SessionService.update_session(session)
                return

            # 1. Determina o proximo no
            next_node = self.graph.get_next_node(session.current_node_id)

            if not next_node:
                logger.info(f"🏁 Fluxo finalizado para {session.contact_phone} ({auto_steps} passo(s))")
                session.is_completed = True
                await SessionService.update_session(session)
                return

            logger.info(f"⚡ Executando Nó: {next_node.id} ({next_node.type}) [passo {auto_steps}]")

            # 2. Executa a acao do no atual
            if next_node.type == NodeType.MESSAGE:
                await NodeActions.execute_message_node(
                    next_node, session.tenant_id, session.contact_phone, session.variables
                )

            elif next_node.type == NodeType.AI:
                await NodeActions.execute_ai_node(
                    next_node, session.tenant_id, session.contact_phone,
                    session.variables, user_input or ""
                )

            elif next_node.type == NodeType.HANDOVER:
                await NodeActions.execute_handover_node(session.tenant_id, session.contact_phone)
                session.is_human_support = True
                session.is_completed = False
                session.current_node_id = next_node.id
                await SessionService.update_session(session)
                logger.info(f"👥 Handover realizado para {session.contact_phone}. Fluxo pausado.")
                return  # Pausa — agente humano assume

            elif next_node.type == NodeType.CONDITION:
                # TODO: implementar logica de branching condicional
                pass

            elif next_node.type == NodeType.AB_SPLIT:
                choice = random.choice(["A", "B"])
                logger.info(f"📊 A/B Testing: {session.contact_phone} → Versão {choice}")
                targets = self.graph.adj.get(next_node.id, [])
                if len(targets) >= 2:
                    next_id = targets[0] if choice == "A" else targets[1]
                    resolved = self.graph.nodes.get(next_id)
                    if resolved:
                        next_node = resolved

            # 3. Atualiza estado da sessao
            session.current_node_id = next_node.id
            await SessionService.update_session(session)

            # 4. Decide se continua o loop automaticamente ou para para aguardar input
            #
            # Continua automaticamente SOMENTE se:
            #   - O no for do tipo MESSAGE E nao exigir input do usuario
            # Em qualquer outro caso (AI, CONDITION, AB_SPLIT, etc.), para e
            # aguarda a proxima mensagem do usuario para evitar execucao desenfreada.
            should_auto_advance = (
                next_node.type == NodeType.MESSAGE
                and not next_node.data.get("expect_input")
            )

            if not should_auto_advance:
                logger.debug(
                    f"[FlowExecutor] Pausando em '{next_node.id}' ({next_node.type}) "
                    f"— aguardando input ou no nao-automatico."
                )
                return  # Aguarda proxima mensagem do usuario
