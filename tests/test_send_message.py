import httpx
import time
import sys
import json

# Forçar output em UTF-8 para evitar erros de encode no console do Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://76.13.168.200:8001"
EMAIL = "user@example.com"
PASSWORD = "Qwert@3702959"

def test_send_message():
    login_data = {
        "username": EMAIL,
        "password": PASSWORD
    }
    
    with httpx.Client() as client:
        print(f"[*] Autenticando na API com: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        
        if r.status_code != 200:
            print(f"❌ Falha no login: {r.status_code} - {r.text}")
            return
            
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n🚀 Iniciando Teste de Envio de Mensagem WhatsApp (Outgoing Worker) ...\n")
        
        # 1. Obter uma conversa válida
        print("[1/2] Obtendo uma conversa válida ou contato base da API...")
        r = client.get(f"{BASE_URL}/api/v1/chat/conversations?limit=1", headers=headers)
        
        target_jid = ""
        
        if r.status_code == 200:
            data = r.json()
            conversations = data.get("conversations", [])
            if conversations:
                target_jid = conversations[0].get("id")
                name = conversations[0].get("name") or "Sem nome"
                print(f"✅ Encontrado no histórico recente: {name} ({target_jid})")
            else:
                print("⚠️ Histórico de conversas vazio. Será necessário digitar um número.")
        else:
            print(f"⚠️ Não foi possível obter conversas (Status: {r.status_code}). Será necessário digitar um número.")

        # Pede confirmação ou input manual
        user_input = input(f"\nDigite o Número do destinatário (apenas números) ou JID para testar o envio\n[Ou aperte ENTER para usar o sugerido: {target_jid}]: ").strip()
        
        if user_input:
            # Se for apenas número e não conter @, adiciona o sufixo padrão do WhatsApp
            if "@" not in user_input:
                target_jid = f"{user_input}@s.whatsapp.net"
            else:
                target_jid = user_input
                
        if not target_jid:
            print("❌ Nenhum destinatário informado. Encerrando teste.")
            return

        print(f"✅ Destinatário definido: {target_jid}")
        
        # 2. Enviar a mensagem
        print(f"\n[2/2] Disparando POST /api/v1/chat/send ...")
        payload = {
            "conversation_id": target_jid,
            "content": "🦾 Olá! Esta é uma mensagem de teste automatizada disparada pelo script via FastAPI -> RabbitMQ -> Node.js Baileys Bridge."
        }
        
        start_time = time.time()
        r = client.post(f"{BASE_URL}/api/v1/chat/send", json=payload, headers=headers)
        elapsed = time.time() - start_time
        
        if r.status_code in [200, 202]:
            print(f"✅ Sucesso! A mensagem foi postada na fila em {elapsed:.2f}s!")
            print(f"Detalhes da Resposta: {json.dumps(r.json(), indent=2)}")
            print("\n🚨 IMPORTANTE: Verifique no aplicativo do WhatsApp e na UI se a mensagem realmente chegou ao destinatário.")
            print("Se não chegar, cheque os logs do `outgoing_worker` via terminal (docker compose logs -f saas_api).")
        else:
            print(f"❌ Falha ao tentar postar a mensagem. Status HTTP: {r.status_code}")
            print(f"Detalhes: {r.text}")


if __name__ == "__main__":
    try:
        test_send_message()
    except KeyboardInterrupt:
        print("\nTeste cancelado.")
