import httpx
import time
import sys
import json

# ==============================================================================
# SCRIPT DE REFERÊNCIA - INTEGRAÇÃO FRONT-END COM O CHAT UNIFICADO
# ==============================================================================
# Use este script como base para implementar o disparo de mensagens no Front-end.
# A API agora suporta dois formatos no campo "conversation_id":
#
# 1. ID INTERNO DO BANCO (INT/STR Curta): Ex: "1", "45"
#    (O Back-end buscará a tabela conversations e extrairá o contact_phone correto).
# 
# 2. NUMERO DE TELEFONE (JID): Ex: "5511999999999@s.whatsapp.net" ou "5511999999999"
#    (O Back-end utilizará o telefone e formatará para envio direto à sessão do bot).
# ==============================================================================

# Forçar output em UTF-8 para evitar erros de encode no console do Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://76.13.168.200:8001"
EMAIL = "user@example.com"
PASSWORD = "Qwert@3702959"

def test_send_message():
    login_data = {"username": EMAIL, "password": PASSWORD}
    
    with httpx.Client() as client:
        print(f"[*] Autenticando na API com: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        
        if r.status_code != 200:
            print(f"❌ Falha no login: {r.status_code} - {r.text}")
            return
            
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        print("\n🚀 Iniciando Teste de Referência para Integração com Front-end...\n")
        
        # 1. Demonstarção da Escolha do Formato do ID
        print("💡 DICA DE INTEGRAÇÃO FRONT-END:")
        print("Se o seu front-end exibir a URL /chat/1, você pode enviar o ID '1'.")
        print("Se ele exibir a URL /chat/5511999999999, você envia '5511999999999'.")
        
        user_input = input(f"\nDigite o ID Interno do Banco OU o Número do WhatsApp (JID) para disparar:\nEx: '1' ou '5511999999999': ").strip()
        
        if not user_input:
            print("❌ Teste abortado: Nenhum ID informado.")
            return

        print(f"\n✅ Preparando para chamar a API /api/v1/chat/send com conversation_id = '{user_input}'")
        
        # 2. Construindo o Payload (Este é o body do seu axios.post/fetch no Frontend)
        payload = {
            "conversation_id": user_input,
            "content": f"🦾 Olá! Esta é uma mensagem disparada pela API.\n\n[Referência: O Front-end enviou o ID '{user_input}' e o Back-end tratou do roteamento automaticamente!]"
        }
        
        # Exemplo em Axios Equivalente:
        # axios.post('http://76.13.168.200:8001/api/v1/chat/send', {
        #    conversation_id: "1", // ou "5511999999999"
        #    content: "Oi!"
        # }, { headers: { Authorization: "Bearer TOKEN" } })

        start_time = time.time()
        
        print(f"[⌛] Disparando HTTP POST -> /api/v1/chat/send ...")
        r = client.post(f"{BASE_URL}/api/v1/chat/send", json=payload, headers=headers)
        
        elapsed = time.time() - start_time
        
        if r.status_code in [200, 202]:
            print(f"\n✅ Sucesso HTTP {r.status_code}! Retornou em {elapsed:.2f}s")
            print(f"Detalhes da Resposta: {json.dumps(r.json(), indent=2)}")
            print("\n🚨 O Back-end executou os seguintes passos:")
            print("1. Salvou a mensagem no histórico do Postgres e no MongoDB de forma unificada.")
            print(f"2. Converteu '{user_input}' pro telefone real (caso seja um ID do Banco) graças a nossa última melhoria.")
            print("3. Instanciou o 'message.outgoing' na fila do RabbitMQ.")
            print("4. O novo 'OutgoingWorker' do back-end consumiu a fila e conectou na Bridge do Baileys para o celular final.")
        else:
            print(f"❌ Falha ao tentar postar a mensagem. Status HTTP: {r.status_code}")
            print(f"Detalhes: {r.text}")


if __name__ == "__main__":
    try:
        test_send_message()
    except KeyboardInterrupt:
        print("\nTeste cancelado.")
