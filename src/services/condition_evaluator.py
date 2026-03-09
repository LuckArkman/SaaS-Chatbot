import re
from typing import Any, Dict
from loguru import logger

class ConditionEvaluator:
    """
    Avalia expressões lógicas simples baseadas em variáveis de sessão.
    Suporta formatos como: {{variable_name}} == "value", {{count}} > 5, etc.
    Replicando a lógica de condições do FlowBuilder original.
    """
    @staticmethod
    def evaluate(expression: str, variables: Dict[str, Any]) -> bool:
        try:
            # 1. Substitui as variáveis {{var}} pelos seus valores reais
            processed_expr = expression
            for var_name, var_value in variables.items():
                placeholder = "{{" + var_name + "}}"
                if placeholder in processed_expr:
                    # Formata valor para string segura em eval (aspas para strings)
                    formatted_value = f'"{var_value}"' if isinstance(var_value, str) else str(var_value)
                    processed_expr = processed_expr.replace(placeholder, formatted_value)
            
            # 2. Limpeza de segurança (apenas operadores básicos permitidos)
            # Remove qualquer tentativa de executar código malicioso
            if re.search(r"[a-zA-Z_][a-zA-Z0-9_]*\(", processed_expr):
                logger.warning(f"⚠️ Expressão suspeita bloqueada: {expression}")
                return False
            
            # 3. Avaliação da expressão (Python é flexível para booleanos básicos)
            # Nota: Em um ambiente real altamente crítico, usaríamos um parser AST.
            # Para o MVP da migração, eval restrito resolve.
            result = eval(processed_expr, {"__builtins__": {}}, {})
            return bool(result)
            
        except Exception as e:
            logger.error(f"❌ Erro ao avaliar condição '{expression}': {e}")
            return False

    @staticmethod
    def inject_variables(text: str, variables: Dict[str, Any]) -> str:
        """Substitui placeholders no texto final enviado ao usuário."""
        for var_name, var_value in variables.items():
            text = text.replace("{{" + var_name + "}}", str(var_value))
        return text
