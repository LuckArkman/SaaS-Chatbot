import os
import ast

def analyze_ast(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        tree = ast.parse(content)
        
        info = {
            "classes": [],
            "functions": [],
            "imports": [],
            "module_docstring": ast.get_docstring(tree, clean=True) or "Sem docstring no módulo."
        }
        
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    info["imports"].append(n.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module if node.module else ""
                for n in node.names:
                    info["imports"].append(f"{module}.{n.name}")
            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                func_info = {
                    "name": node.name,
                    "docstring": ast.get_docstring(node, clean=True) or "Sem docstring.",
                    "args": [arg.arg for arg in node.args.args],
                    "returns": ast.unparse(node.returns) if node.returns else "None"
                }
                info["functions"].append(func_info)
            elif isinstance(node, ast.ClassDef):
                class_info = {
                    "name": node.name,
                    "docstring": ast.get_docstring(node, clean=True) or "Sem docstring.",
                    "methods": [],
                    "bases": [ast.unparse(b) for b in node.bases]
                }
                for class_node in node.body:
                    if isinstance(class_node, ast.FunctionDef) or isinstance(class_node, ast.AsyncFunctionDef):
                        meth_info = {
                            "name": class_node.name,
                            "docstring": ast.get_docstring(class_node, clean=True) or "Sem docstring.",
                            "args": [arg.arg for arg in class_node.args.args]
                        }
                        class_info["methods"].append(meth_info)
                info["classes"].append(class_info)
                
        return info
    except Exception as e:
        return {"error": str(e)}

def generate_markdown(src_dir, output_file):
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("# 🌌 Análise Profunda e Vasta do Backend do Projeto SaaS Chatbot\n\n")
        out.write("Esta documentação compreende uma análise extensa, exaustiva e detalhada de **todos** os scripts pertencentes ao backend da plataforma SaaS Chatbot.\n")
        out.write("A estrutura do projeto foi analisada a fundo, mapeando módulos, classes, métodos, dependências e suas funções assíncronas/síncronas no ecossistema.\n\n")
        out.write("---\n\n")
        
        for root, dirs, files in os.walk(src_dir):
            if '__pycache__' in root or '.idea' in root:
                continue
                
            python_files = [f for f in files if f.endswith('.py')]
            markdown_files = [f for f in files if f.endswith('.md')]
            
            if not python_files and not markdown_files:
                continue
                
            rel_path = os.path.relpath(root, src_dir)
            if rel_path == '.':
                rel_path = 'Raiz do Projeto (src/)'
                
            out.write(f"## 📁 Diretório: `{rel_path}`\n\n")
            
            for file in python_files:
                filepath = os.path.join(root, file)
                out.write(f"### 📄 Arquivo: `{file}`\n")
                
                analysis = analyze_ast(filepath)
                if "error" in analysis:
                    out.write(f"**Erro ao analisar o arquivo:** {analysis['error']}\n\n")
                    continue
                
                out.write(f"**Docstring do Módulo:**\n> {analysis['module_docstring'][:500]}\n\n")
                
                if analysis['imports']:
                    out.write("**Dependências / Imports Principais:**\n")
                    out.write(f"- {', '.join(analysis['imports'][:15])}\n\n")
                
                if analysis['classes']:
                    out.write("**Classes Definidas:**\n")
                    for cls in analysis['classes']:
                        out.write(f"#### 🏛️ Classe: `{cls['name']}`\n")
                        if cls['bases']:
                            out.write(f"- **Herda de:** `{', '.join(cls['bases'])}`\n")
                        out.write(f"- **Descrição:** {cls['docstring']}\n")
                        
                        if cls['methods']:
                            out.write("- **Métodos:**\n")
                            for method in cls['methods']:
                                out.write(f"  - `def {method['name']}({', '.join(method['args'])})`\n")
                                out.write(f"    - *Ação:* {method['docstring'][:100]}...\n")
                        out.write("\n")
                
                if analysis['functions']:
                    out.write("**Funções Definidas (Módulo):**\n")
                    for func in analysis['functions']:
                        out.write(f"- `def {func['name']}({', '.join(func['args'])}) -> {func['returns']}`\n")
                        out.write(f"  - *Descrição:* {func['docstring'][:150]}...\n")
                out.write("\n---\n\n")

if __name__ == '__main__':
    src = r'D:\SaaS-Chatbot\src'
    out = r'D:\SaaS-Chatbot\docs\backend_analysis.md'
    generate_markdown(src, out)
    print("Análise concluída.")
