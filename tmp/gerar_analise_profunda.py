import os
import ast
import re

def analyze_python_ast(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        tree = ast.parse(content)
        
        info = {
            "module_docstring": ast.get_docstring(tree, clean=True) or "Sem docstring.",
            "imports": [],
            "classes": [],
            "functions": []
        }
        
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    info["imports"].append(n.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module if node.module else ""
                for n in node.names:
                    info["imports"].append(f"{module}.{n.name}")
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_info = {
                    "name": node.name,
                    "docstring": ast.get_docstring(node, clean=True) or "Sem docstring.",
                    "args": [arg.arg for arg in node.args.args],
                    "returns": ast.unparse(node.returns) if node.returns else "Variável/Não tipado"
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
                    if isinstance(class_node, (ast.FunctionDef, ast.AsyncFunctionDef)):
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

def analyze_markdown(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        title = "Sem Título"
        summary = ""
        for line in lines:
            if line.startswith('# '):
                title = line.replace('# ', '').strip()
                break
            elif line.startswith('title:'):
                title = line.replace('title:', '').strip()
                break
                
        # Get first non-empty paragraph for summary
        for line in lines:
            clean_line = line.strip()
            if clean_line and not clean_line.startswith('#') and not clean_line.startswith('-') and not clean_line.startswith('---'):
                summary = clean_line[:300] + ('...' if len(clean_line) > 300 else '')
                break
                
        return {"title": title, "summary": summary, "lines": len(lines)}
    except Exception as e:
        return {"error": str(e)}

def generate_report(src_dir, root_dir, output_file):
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("# 🌌 Análise Profunda, Vasta e Detalhada - SaaS Chatbot Backend\n\n")
        out.write("Esta documentação compreende a **análise mais minuciosa e rica** do ecossistema backend e das documentações que compõem o SaaS Chatbot. Cada camada, serviço, controller e fluxo foi esmiuçado.\n\n")
        
        # 1. MARKDOWNS
        out.write("## 📚 1. Documentações e Markdowns (Sprints, Guias, MVP)\n\n")
        out.write("Os markdowns ditam o rumo, os requisitos e a arquitetura do projeto. Abaixo encontra-se a análise de cada manifesto do projeto.\n\n")
        
        md_paths = [root_dir, os.path.join(root_dir, 'sprints'), os.path.join(root_dir, 'docs')]
        for path in md_paths:
            if not os.path.exists(path): continue
            
            out.write(f"### 📍 Diretório: `{os.path.relpath(path, root_dir)}`\n\n")
            for file in sorted(os.listdir(path)):
                if file.endswith('.md'):
                    md_path = os.path.join(path, file)
                    analysis = analyze_markdown(md_path)
                    
                    if 'error' in analysis:
                        out.write(f"#### 📄 `{file}` - *Erro de leitura*\n")
                        continue
                        
                    out.write(f"#### 📄 `{file}`\n")
                    out.write(f"- **Título Identificado:** {analysis['title']}\n")
                    out.write(f"- **Total de Linhas:** {analysis['lines']}\n")
                    out.write(f"- **Síntese / Resumo:** {analysis['summary']}\n\n")
        
        # 2. PYTHON BACKEND
        out.write("---\n\n## ⚙️ 2. Análise do Código-Fonte (Scaffold, Controllers, Services, Models)\n\n")
        out.write("Uma dissecção profunda de todos os módulos Python do ecossistema de microsserviços e rotas da API.\n\n")
        
        for root, dirs, files in os.walk(src_dir):
            if '__pycache__' in root or '.idea' in root: continue
            
            python_files = [f for f in files if f.endswith('.py')]
            if not python_files: continue
            
            rel_path = os.path.relpath(root, src_dir)
            
            layer_name = rel_path
            if rel_path == '.': layer_name = "Raiz (Configurações e Entrypoints)"
            
            out.write(f"### 📁 Camada: `{layer_name}`\n\n")
            
            for file in sorted(python_files):
                filepath = os.path.join(root, file)
                out.write(f"#### 📜 Script: `{file}`\n")
                
                analysis = analyze_python_ast(filepath)
                if "error" in analysis:
                    out.write(f"- **Erro analítico:** {analysis['error']}\n\n")
                    continue
                
                out.write(f"- **Propósito do Módulo:** {analysis['module_docstring'][:300]}\n")
                if analysis['imports']:
                    out.write(f"- **Engrenagens (Imports):** `{', '.join(analysis['imports'][:10])}{' ...' if len(analysis['imports']) > 10 else ''}`\n")
                
                if analysis['classes']:
                    out.write("\n  **🏗️ Entidades / Classes Internas:**\n")
                    for cls in analysis['classes']:
                        bases = f" (Herda de: `{', '.join(cls['bases'])}`)" if cls['bases'] else ""
                        out.write(f"  - **{cls['name']}**{bases}\n")
                        out.write(f"    - *Responsabilidade:* {cls['docstring'][:150]}\n")
                        if cls['methods']:
                            out.write(f"    - *Métodos:* {', '.join([m['name'] for m in cls['methods']])}\n")
                
                if analysis['functions']:
                    out.write("\n  **⚡ Controladores / Funções de Nível Superior:**\n")
                    for func in analysis['functions']:
                        out.write(f"  - `def {func['name']} ({', '.join(func['args'])[:30]}) -> {func['returns']}`\n")
                        out.write(f"    - *Ação:* {func['docstring'][:100]}\n")
                out.write("\n")

if __name__ == '__main__':
    root_dir = r'd:\SaaS-Chatbot'
    src_dir = r'd:\SaaS-Chatbot\src'
    out_file = r'd:\SaaS-Chatbot\docs\Analise_Minuciosa_SaaS_Chatbot.md'
    generate_report(src_dir, root_dir, out_file)
    print(f"Relatório gerado com sucesso em: {out_file}")
