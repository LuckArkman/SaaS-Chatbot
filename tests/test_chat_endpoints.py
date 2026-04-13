import httpx
import json
import time
import sys

# Configurações do ambiente
BASE_URL = "http://76.13.168.200:8001/api/v1"
EMAIL = "user@example.com"
PASSWORD = "Qwert@3702959"

def run_chat_tests():
    print("🚀 Iniciando teste automatizado das rotas de Chat do Agente...")
    
    with httpx.Client(timeout=10.0) as client:
        # 1. Login
        print("\n[*] 1. Autenticando...")
        login_data = {"username": EMAIL, "password": PASSWORD}
        try:
            r = client.post(f"{BASE_URL}/auth/login", data=login_data)
            if r.status_code != 200:
                print(f"❌ Falha no login: {r.status_code} - {r.text}")
                return
            
            token = r.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            print("✅ Autenticado com sucesso.")
        except Exception as e:
            print(f"❌ Erro de conexão ao autenticar: {e}")
            return

        # 2. Obter informações do usuário logado (/auth/me)
        print("\n[*] 2. Obtendo dados do agente atual (/auth/me)...")
        r = client.get(f"{BASE_URL}/auth/me", headers=headers)
        if r.status_code == 200:
            user_data = r.json()
            user_id = str(user_data.get("id"))
            user_name = user_data.get("full_name")
            print(f"✅ Agente: {user_name} (ID: {user_id})")
        else:
            print(f"❌ Falha ao obter dados do usuário: {r.status_code}")
            user_id = "1" # Fallback

        # 3. Testar Presence (/chat/presence/{user_id})
        print(f"\n[*] 3. Testando Presence para agente {user_id}...")
        r = client.get(f"{BASE_URL}/chat/presence/{user_id}", headers=headers)
        if r.status_code == 200:
            print(f"✅ Status de Presença: {r.json()}")
        else:
            print(f"❌ Presence falhou: {r.status_code} - {r.text}")

        # 4. Testar Send Message (/chat/send)
        dummy_phone = "5511999999999"
        print(f"\n[*] 4. Testando envio de mensagem para {dummy_phone}...")
        send_payload = {
            "conversation_id": dummy_phone,
            "content": "Mensagem de teste automatizada enviada pelo script de controle."
        }
        r = client.post(f"{BASE_URL}/chat/send", json=send_payload, headers=headers)
        if r.status_code == 202:
            print(f"✅ Envio de mensagem aceito pelo servidor (HTTP 202).")
        else:
            print(f"❌ Envio de mensagem falhou: {r.status_code} - {r.text}")

        # 5. Testar Typing Status (/chat/typing)
        print(f"\n[*] 5. Testando status de 'digitando' para {dummy_phone}...")
        params = {"is_typing": "true", "conversation_id": dummy_phone}
        r = client.post(f"{BASE_URL}/chat/typing", params=params, headers=headers)
        if r.status_code == 200:
            print(f"✅ Typing status atualizado para 'True'.")
        else:
            print(f"❌ Typing status falhou: {r.status_code} - {r.text}")

        # 6. Testar History (/chat/history/{conversation_id})
        print(f"\n[*] 6. Testando recuperação de histórico para {dummy_phone}...")
        r = client.get(f"{BASE_URL}/chat/history/{dummy_phone}", headers=headers)
        if r.status_code == 200:
            history = r.json()
            print(f"✅ Histórico recuperado com sucesso. Total de mensagens: {len(history)}")
            if len(history) > 0:
                print(f"   Última mensagem: {history[0].get('content')}")
        else:
            print(f"❌ Histórico falhou: {r.status_code} - {r.text}")

        # 7. Testar Transferência (/chat/transfer/{conversation_id})
        # Tentaremos transferir para o próprio agente ou um ID 999 para validar o comportamento
        target_id = 999
        print(f"\n[*] 7. Testando transferência de chat para agente {target_id}...")
        params = {"target_agent_id": target_id}
        r = client.post(f"{BASE_URL}/chat/transfer/{dummy_phone}", params=params, headers=headers)
        if r.status_code == 200:
            res = r.json()
            if "error" in res:
                print(f"ℹ️ Transferência retornou resposta controlada do serviço: {res['error']}")
            else:
                print(f"✅ Transferência realizada com sucesso.")
        else:
            print(f"❌ Transferência falhou (Erro HTTP): {r.status_code} - {r.text}")

    print("\n🏁 Testes finalizados.")

if __name__ == "__main__":
    run_chat_tests()
