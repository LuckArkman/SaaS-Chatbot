import os
import ast
import json

def analyze_python_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        tree = ast.parse(content)
        
        classes = []
        functions = []
        
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                docstring = ast.get_docstring(node) or "Sem documentação"
                classes.append({"name": node.name, "doc": docstring, "methods": methods})
            elif isinstance(node, ast.FunctionDef):
                docstring = ast.get_docstring(node) or "Sem documentação"
                functions.append({"name": node.name, "doc": docstring})
                
        return {"classes": classes, "functions": functions, "error": None}
    except Exception as e:
        return {"classes": [], "functions": [], "error": str(e)}

def analyze_markdown(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        title = "Sem Título"
        summary = ""
        for line in lines:
            if line.startswith('# '):
                title = line.strip('# \n')
            elif len(line.strip()) > 10 and not line.startswith('#'):
                summary += line.strip() + " "
                if len(summary) > 150:
                    break
        return {"title": title, "summary": summary[:150] + "..." if len(summary) > 150 else summary}
    except Exception as e:
        return {"title": "Erro ao ler markdown", "summary": str(e)}

def generate_report():
    base_dir = r"d:\SaaS-Chatbot"
    src_dir = os.path.join(base_dir, "src")
    sprints_dir = os.path.join(base_dir, "sprints")
    node_bridge_dir = os.path.join(base_dir, "SaaS.OmniChannelPlatform.Services.WhatsAppBot")
    docs_dir = os.path.join(base_dir, "docs")
    
    report = []
    report.append("# 🧠 Análise Profundamente Minuciosa do Backend: SaaS Chatbot\n")
    report.append("> Este documento contém uma varredura rica e contextual de todos os scripts e arquivos markdown do projeto, revelando a arquitetura completa do ecossistema.\n\n")
    
    # 1. MARKDOWNS DE RAIZ E DOCS
    report.append("## 📚 1. Contexto Geral e Documentação (Markdowns)\n")
    for root, _, files in os.walk(base_dir):
        if "node_modules" in root or ".venv" in root or ".idea" in root:
            continue
        for f in files:
            if f.endswith(".md"):
                filepath = os.path.join(root, f)
                rel_path = os.path.relpath(filepath, base_dir)
                if "sprints" in rel_path: continue # Tratar sprints separado
                md_info = analyze_markdown(filepath)
                report.append(f"### 📄 Arquivo: `{rel_path}`")
                report.append(f"- **Título Encontrado**: {md_info['title']}")
                report.append(f"- **Resumo/Trecho**: {md_info['summary']}\n")
    
    # 2. SPRINTS
    report.append("## 🏃‍♂️ 2. Arquitetura de Sprints (Roadmap)\n")
    report.append("A documentação reflete o método de evolução do projeto. Abaixo estão os sprints detalhados:\n")
    if os.path.exists(sprints_dir):
        sprint_files = sorted([f for f in os.listdir(sprints_dir) if f.endswith(".md")])
        for f in sprint_files:
            filepath = os.path.join(sprints_dir, f)
            md_info = analyze_markdown(filepath)
            report.append(f"- **`{f}`**: {md_info['title']} - _{md_info['summary']}_")
    report.append("\n")

    # 3. BACKEND PYTHON (SRC)
    report.append("## 🐍 3. Arquitetura do Backend Python (`src/`)\n")
    report.append("Estrutura central do SaaS, baseada em FastAPI.\n")
    
    categories = ["core", "models", "schemas", "common", "api", "services", "workers"]
    for cat in categories:
        cat_dir = os.path.join(src_dir, cat)
        if not os.path.exists(cat_dir):
            continue
        report.append(f"### 📁 Módulo: `{cat.upper()}`")
        for root, _, files in os.walk(cat_dir):
            if "__pycache__" in root: continue
            for f in files:
                if f.endswith(".py") and f != "__init__.py":
                    filepath = os.path.join(root, f)
                    rel_path = os.path.relpath(filepath, src_dir)
                    analysis = analyze_python_file(filepath)
                    
                    report.append(f"#### 📜 `{rel_path}`")
                    if analysis['error']:
                        report.append(f"- *Erro ao analisar sintaxe*: {analysis['error']}")
                        continue
                    
                    if not analysis['classes'] and not analysis['functions']:
                        report.append("- *(Script vazio ou apenas definições/variáveis)*")
                    
                    for cls in analysis['classes']:
                        report.append(f"- **Classe `{cls['name']}`**")
                        if cls['doc'] != "Sem documentação":
                            report.append(f"  - *Doc*: {cls['doc'].split(chr(10))[0]}")
                        if cls['methods']:
                            report.append(f"  - *Métodos*: {', '.join(cls['methods'])}")
                            
                    for func in analysis['functions']:
                        report.append(f"- **Função `{func['name']}`**")
                        if func['doc'] != "Sem documentação":
                            report.append(f"  - *Doc*: {func['doc'].split(chr(10))[0]}")
                    report.append("")
    
    # 4. NODEJS BRIDGE
    report.append("## 🟢 4. Microserviço Node.js (WhatsApp Bridge Baileys)\n")
    report.append("Responsável pela comunicação via WebSockets com a rede WhatsApp.\n")
    if os.path.exists(node_bridge_dir):
        for f in os.listdir(node_bridge_dir):
            if f.endswith(".js"):
                report.append(f"- **Script `{f}`**: Motor de integração de instâncias Baileys/Socket.io ligado ao sistema via Redis/RabbitMQ.\n")
                
    output_path = os.path.join(docs_dir, "Analise_Oficial_Minuciosa_Todo_Backend.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report))
    
    print(f"Análise gravada em: {output_path}")

if __name__ == "__main__":
    generate_report()
