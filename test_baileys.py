import httpx
import time
import sys

# Configurações do ambiente VPS
BASE_URL = 'http://76.13.168.200:8001'
EMAIL = f'test_baileys_{int(time.time())}@example.com' # Email único por teste
PASSWORD = 'Password123!'

def run_test():
    print(f"[*] Iniciando Teste de Sincronização WhatsApp (Baileys)")
    print(f"[*] Alvo: {BASE_URL}")
    print(f"[*] Usuário Temporário: {EMAIL}")
    print("-" * 50)

    with httpx.Client(timeout=30.0) as client:
        # 1. Registro do Usuário
        print("[1/4] Registrando novo usuário...")
        reg_payload = {
            "email": EMAIL,
            "password": PASSWORD,
            "fullName": "Baileys Test User",
            "tenantName": "TestTenant"
        }
        try:
            r = client.post(f"{BASE_URL}/api/v1/auth/register", json=reg_payload)
            r.raise_for_status()
            print(" ✅ Registro concluído.")
        except Exception as e:
            print(f" ❌ Erro no registro: {e}")
            return

        # 2. Login para obter Token
        print("[2/4] Realizando login...")
        login_data = {"username": EMAIL, "password": PASSWORD}
        try:
            r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
            r.raise_for_status()
            token = r.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            print(" ✅ Login OK. Token capturado.")
        except Exception as e:
            print(f" ❌ Erro no login: {e}")
            return

        # 3. Inicialização do Bot
        print("[3/4] Solicitando inicialização do Bot...")
        try:
            r = client.post(f"{BASE_URL}/api/v1/bot/start", headers=headers)
            print(f" ℹ️ Resposta API: {r.status_code} - {r.json()}")
            if r.status_code in [200, 202]:
                print(" ✅ Comando de inicialização enviado com sucesso.")
            else:
                print(" ❌ Falha ao iniciar bot.")
                return
        except Exception as e:
            print(f" ❌ Erro ao chamar /start: {e}")
            return

        # 4. Polling do QR Code
        print("[4/4] Aguardando geração do QR Code (polling)...")
        max_attempts = 15
        for i in range(max_attempts):
            try:
                r = client.get(f"{BASE_URL}/api/v1/bot/qr", headers=headers)
                
                if r.status_code == 200:
                    qr_data = r.json().get("qrcode")
                    print("\n" + "="*50)
                    print(" 🎉 SUCESSO! QR CODE RECEBIDO!")
                    print(f" Tamanho do Base64: {len(qr_data)} caracteres")
                    print(f" Início: {qr_data[:50]}...")
                    print("="*50)
                    print("\n[*] Teste finalizado com sucesso.")
                    return
                elif r.status_code == 404:
                    print(f"  ({i+1}/{max_attempts}) QR ainda não disponível (Bridge processando...)")
                else:
                    print(f"  ({i+1}/{max_attempts}) Status inesperado: {r.status_code}")
                
            except Exception as e:
                print(f"  (!) Erro durante polling: {e}")
            
            time.sleep(5)

        print("\n ❌ Timeout: O QR Code não foi gerado dentro do tempo esperado.")

if __name__ == "__main__":
    run_test()
