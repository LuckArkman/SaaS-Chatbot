import os
import ast

def analyze_python_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        tree = ast.parse(source)
    except Exception as e:
        return f"Erro ao fazer parse de {filepath}: {e}\n"

    result = [f"### 📄 Arquivo: `{os.path.basename(filepath)}`"]
    
    # Docstring do modulo
    docstring = ast.get_docstring(tree)
    if docstring:
        result.append(f"**Docstring:**\n> {docstring}\n")
    else:
        result.append("**Docstring:**\n> Sem docstring no módulo.\n")
        
    imports = []
    classes = []
    functions = []
    
    for node in tree.body:
        if isinstance(node, ast.Import):
            for n in node.names:
                imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            module = node.module if node.module else ''
            for n in node.names:
                imports.append(f"{module}.{n.name}")
        elif isinstance(node, ast.ClassDef):
            class_info = [f"#### 🏛️ Classe: `{node.name}`"]
            bases = [b.id for b in node.bases if isinstance(b, ast.Name)]
            if bases:
                class_info.append(f"- **Herda de:** `{', '.join(bases)}`")
            cdoc = ast.get_docstring(node)
            if cdoc:
                class_info.append(f"- **Descrição:** {cdoc}")
            else:
                class_info.append("- **Descrição:** Sem docstring.")
                
            methods = []
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    methods.append(f"  - `def {item.name}(...):`")
            if methods:
                class_info.append("- **Métodos:**")
                class_info.extend(methods)
            classes.append("\n".join(class_info))
            
        elif isinstance(node, ast.FunctionDef):
            fdoc = ast.get_docstring(node)
            f_info = [f"- `def {node.name}(...) -> ...`"]
            if fdoc:
                f_info.append(f"  - *Descrição:* {fdoc}")
            else:
                f_info.append("  - *Descrição:* Sem docstring.")
            functions.append("\n".join(f_info))
            
    if imports:
        result.append("**Dependências / Imports Principais:**")
        result.append(f"- {', '.join(imports)}\n")
        
    if classes:
        result.append("**Classes Definidas:**")
        result.extend(classes)
        result.append("\n")
        
    if functions:
        result.append("**Funções Globais:**")
        result.extend(functions)
        result.append("\n")
        
    return "\n".join(result)

def analyze_markdown(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
         return f"Erro ao ler {filepath}: {e}\n"
    
    title = os.path.basename(filepath)
    for line in lines:
        if line.startswith("# "):
            title = line.strip("# \n")
            break
            
    total_lines = len(lines)
    summary = ""
    for line in lines:
        if line.strip() and not line.startswith("#"):
            summary = line.strip()[:200] + "..." if len(line) > 200 else line.strip()
            break
            
    return f"#### 📄 `{os.path.basename(filepath)}`\n- **Título:** {title}\n- **Total de Linhas:** {total_lines}\n- **Resumo/Início:** {summary}\n"

def process_directory():
    root_dir = r"d:\SaaS-Chatbot"
    output_file = os.path.join(root_dir, "docs", "Backend_Deep_Audit_Report.md")
    
    markdown_content = ["# 🌌 Auditoria Estendida e Detalhada do Backend e Documentação",
                        "\nEste documento contém a análise abrangente e profunda de todos os scripts do backend (Python e Node.js) e de todos os arquivos Markdown presentes no projeto.",
                        "\n---\n## 📚 1. Arquivos Markdown e Documentação\n"]
                        
    # Process MD files
    md_dirs = [root_dir, os.path.join(root_dir, "sprints"), os.path.join(root_dir, "docs")]
    for d in md_dirs:
        if not os.path.exists(d): continue
        markdown_content.append(f"\n### 📍 Diretório: `{os.path.relpath(d, root_dir)}`\n")
        for f in os.listdir(d):
            if f.endswith(".md") and f != "Backend_Deep_Audit_Report.md":
                filepath = os.path.join(d, f)
                markdown_content.append(analyze_markdown(filepath))
                
    markdown_content.append("\n---\n## ⚙️ 2. Análise Estrutural do Backend (Python - API)\n")
    
    src_dir = os.path.join(root_dir, "src")
    if os.path.exists(src_dir):
        for path, dirs, files in os.walk(src_dir):
            if "__pycache__" in path: continue
            py_files = [f for f in files if f.endswith(".py")]
            if py_files:
                markdown_content.append(f"\n### 📁 Camada: `{os.path.relpath(path, root_dir)}`\n")
                for pf in py_files:
                    markdown_content.append(analyze_python_file(os.path.join(path, pf)))
                    markdown_content.append("\n---\n")
                    
    markdown_content.append("\n---\n## 🟢 3. Análise do Bridge Node.js (WhatsApp Bot)\n")
    node_dir = os.path.join(root_dir, "SaaS.OmniChannelPlatform.Services.WhatsAppBot")
    if os.path.exists(node_dir):
        for path, dirs, files in os.walk(node_dir):
            if "node_modules" in path: continue
            js_files = [f for f in files if f.endswith(".js")]
            if js_files:
                markdown_content.append(f"\n### 📁 Serviço: `{os.path.relpath(path, root_dir)}`\n")
                for jf in js_files:
                    try:
                        filepath = os.path.join(path, jf)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                        markdown_content.append(f"#### 📄 Arquivo: `{jf}`\n- **Tamanho:** {len(lines)} linhas\n")
                        funcs = []
                        for line in lines:
                            if "function " in line or "=> {" in line:
                                l_clean = line.strip()
                                if l_clean and len(l_clean) < 100:
                                    funcs.append(l_clean)
                        if funcs:
                            markdown_content.append("**Possíveis Funções / Handlers detectados:**")
                            for fn in funcs[:25]:
                                markdown_content.append(f"- `{fn}`")
                            if len(funcs) > 25:
                                markdown_content.append(f"- *... e mais {len(funcs)-25} funções omitidas.*")
                        markdown_content.append("\n---\n")
                    except Exception as e:
                        markdown_content.append(f"Erro ao ler {jf}: {e}")

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("\n".join(markdown_content))
        
    print(f"Relatório gerado com sucesso em: {output_file}")

if __name__ == '__main__':
    process_directory()
