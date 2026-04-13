import ast
import operator
import re
from typing import Any, Dict
from loguru import logger

class ConditionEvaluator:
    """
    Avalia expressões lógicas simples baseadas em variáveis de sessão.
    Suporta formatos como: {{variable_name}} == "value", {{count}} > 5, etc.
    """
    
    # 🔒 FIX CRÍTICO DE SEGURANÇA #18: Substituição do eval() por Árvores de Sintaxe (AST)
    # Mapas de operadores matemáticos estritamente controlados para prevenção de RCE
    _OPERATORS = {
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Gt: operator.gt,
        ast.Lt: operator.lt,
        ast.GtE: operator.ge,
        ast.LtE: operator.le,
    }

    @staticmethod
    def _eval_node(node):
        """Avalia com segurança tipos canônicos de constantes AST."""
        if isinstance(node, ast.Constant):  # Python 3.8+
            return node.value
        elif isinstance(node, ast.Num):     # Fallback Py 3.7-
             return node.n
        elif isinstance(node, ast.Str):     # Fallback Py 3.7-
             return node.s
        elif isinstance(node, ast.Name):
             if node.id == 'None': return None
             if node.id == 'True': return True
             if node.id == 'False': return False
             raise ValueError(f"Name injection not allowed: {node.id}")
        else:
             raise ValueError(f"Unsafe node type: {type(node)}")

    @staticmethod
    def evaluate(expression: str, variables: Dict[str, Any]) -> bool:
        try:
            # 1. Resolve as variáveis usando formato repr() de forma estrita
            processed_expr = expression
            for var_name, var_value in variables.items():
                placeholder = "{{" + var_name + "}}"
                if placeholder in processed_expr:
                    if isinstance(var_value, str):
                        processed_expr = processed_expr.replace(placeholder, repr(var_value))
                    else:
                        processed_expr = processed_expr.replace(placeholder, str(var_value))
            
            # 2. Interpreta string como Abstract Syntax Tree de forma isolada
            tree = ast.parse(processed_expr, mode='eval')
            
            # 3. Limita compilações apenas a operações de comparação restritas
            if not isinstance(tree.body, ast.Compare):
                logger.warning(f"⚠️ Expressão AST irregular (RCE abortado): {expression}")
                return False
                
            left_val = ConditionEvaluator._eval_node(tree.body.left)
            
            if len(tree.body.ops) != 1 or len(tree.body.comparators) != 1:
                logger.warning("⚠️ Encadeamento complexo de operadores não é suportado.")
                return False
                
            op_type = type(tree.body.ops[0])
            if op_type not in ConditionEvaluator._OPERATORS:
                logger.warning(f"⚠️ Operador {op_type} bloqueado.")
                return False
                
            right_val = ConditionEvaluator._eval_node(tree.body.comparators[0])
            
            # 4. Processa resultado matematicamente seguro
            decision = ConditionEvaluator._OPERATORS[op_type](left_val, right_val)
            return bool(decision)
            
        except Exception as e:
            logger.error(f"❌ Erro ao abstrair condição de fluxo '{expression}': {e}")
            return False

    @staticmethod
    def inject_variables(text: str, variables: Dict[str, Any]) -> str:
        """Substitui placeholders no texto final enviado ao usuário."""
        for var_name, var_value in variables.items():
            text = text.replace("{{" + var_name + "}}", str(var_value))
        return text
