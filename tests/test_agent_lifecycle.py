import httpx
import uuid
import json
from loguru import logger

base_url = "http://76.13.168.200:8000"

def get_auth_token(email, password="TestPassword123!"):
    print(f"[*] Autenticando: {email}")
    login_resp = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": email, "password": password}, timeout=30.0)
    if login_resp.status_code == 200:
        return login_resp.json()["access_token"]
    
    print(f"[*] Registrando novo tenant/owner: {email}")
    register_payload = {
        "email": email,
        "password": password,
        "fullName": "Agent Manager Test",
        "tenantName": "Test Agency"
    }
    httpx.post(f"{base_url}/api/v1/auth/register", json=register_payload, timeout=30.0)
    login_resp = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": email, "password": password}, timeout=30.0)
    return login_resp.json()["access_token"]

def test_agent_lifecycle():
    email = f"manager_{str(uuid.uuid4())[:6]}@example.com"
    token = get_auth_token(email)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print("\n🚀 Iniciando Teste de Ciclo de Vida do Agente (FlowEngine)...\n")
    
    # 1. CRIAÇÃO (Create Flow)
    flow_payload = {
        "name": "Agente de Triagem Automática",
        "description": "Agente criado via teste de ciclo de vida.",
        "nodes": [
            {
                "id": "start",
                "type": "input",
                "label": "Início",
                "position": {"x": 50, "y": 50},
                "data": {}
            },
            {
                "id": "msg_1",
                "type": "message",
                "label": "Boas-vindas",
                "position": {"x": 50, "y": 200},
                "data": {"text": "Olá! Eu sou o assistente virtual. Como posso ajudar?"}
            }
        ],
        "edges": [
            {"id": "e1-2", "source": "start", "target": "msg_1"}
        ],
        "trigger_keywords": ["oi", "olá", "ajuda"]
    }
    
    print("[1/6] POST /api/v1/flows/ (Criação)")
    res_create = httpx.post(f"{base_url}/api/v1/flows/", json=flow_payload, headers=headers, timeout=30.0)
    if res_create.status_code != 200:
        print(f"❌ Falha na criação: {res_create.status_code} - {res_create.text}")
        return
    
    flow_data = res_create.json()
    flow_id = flow_data.get("id") or flow_data.get("_id")
    if not flow_id:
        print(f"❌ Erro: ID do fluxo não encontrado na resposta: {flow_data}")
        return
    print(f"✅ Agente criado com ID: {flow_id}")
    
    # 2. LISTAGEM (List Flows)
    print("\n[2/6] GET /api/v1/flows/ (Listagem)")
    res_list = httpx.get(f"{base_url}/api/v1/flows/", headers=headers, timeout=30.0)
    if res_list.status_code == 200:
        print(f"✅ Encontrados {len(res_list.json())} agentes configurados.")
    else:
        print(f"❌ Falha na listagem: {res_list.status_code}")

    # 3. GESTÃO / DETALHES (Get Flow)
    print(f"\n[3/6] GET /api/v1/flows/{flow_id} (Configuração Atual)")
    res_get = httpx.get(f"{base_url}/api/v1/flows/{flow_id}", headers=headers, timeout=30.0)
    print(f"✅ Detalhes recuperados: {res_get.json().get('name')}")

    # 4. ORQUESTRAÇÃO / ATUALIZAÇÃO (Update Flow)
    print(f"\n[4/6] PATCH /api/v1/flows/{flow_id} (Orquestração/Reconfiguração)")
    patch_payload = {"name": "Agente Comercial Inteligente", "is_active": True}
    res_patch = httpx.patch(f"{base_url}/api/v1/flows/{flow_id}", json=patch_payload, headers=headers, timeout=30.0)
    print(f"✅ Agente reconfigurado para: {res_patch.json().get('name')}")

    # 5. ORQUESTRAÇÃO DO MOTOR (Bot Status / Health)
    print("\n[5/6] Orquestração do Motor (Bot Start/Status)")
    res_bot_status = httpx.get(f"{base_url}/api/v1/bot/", headers=headers, timeout=30.0)
    print(f"✅ Status do Bot: {res_bot_status.json().get('status', 'OFFLINE')}")
    
    res_bot_start = httpx.post(f"{base_url}/api/v1/bot/start", headers=headers, timeout=30.0)
    if res_bot_start.status_code in (200, 202):
        print("✅ Comando de inicialização do agente enviado para o Bridge.")
    else:
        # Se for 424/402 já sabemos que é limite ou bridge offline na VPS
        print(f"⚠️ Nota de Orquestração: {res_bot_start.status_code} - {res_bot_start.json().get('detail')}")

    # 6. LIMPEZA / DELEÇÃO (Delete Agent)
    print(f"\n[6/6] DELETE /api/v1/flows/{flow_id} (Remoção)")
    res_del = httpx.delete(f"{base_url}/api/v1/flows/{flow_id}", headers=headers, timeout=30.0)
    if res_del.status_code == 200:
        print("✅ Agente removido com sucesso.")
    else:
        print(f"❌ Falha ao remover: {res_del.status_code}")

    print("\n🎯 Teste de Ciclo de Vida do Agente Concluído!")

if __name__ == "__main__":
    test_agent_lifecycle()
