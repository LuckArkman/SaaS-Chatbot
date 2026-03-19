import httpx
import time
from loguru import logger

import uuid

BASE_URL = "http://76.13.168.200:8000"
EMAIL = "user@example.com"
PASSWORD = "Qwert@3702959"

def test_bot_control():
    # 1. Obter Token
    login_data = {
        "username": EMAIL,
        "password": PASSWORD
    }
    
    with httpx.Client() as client:
        # Tenta login
        logger.info(f"[*] Autenticando: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        
        if r.status_code != 200:
            print(f"❌ Falha no login: {r.status_code} - {r.text}")
            return
        
        token = r.json().get("access_token")
        if not token:
            print("❌ Falha crítica na obtenção do token.")
            return

        headers = {"Authorization": f"Bearer {token}"}

        print("\n🚀 Iniciando Teste de Controle do Bot...\n")

        # [1/4] GET /api/v1/bot/ (Status Inicial)
        print("[1/4] GET /api/v1/bot/ (Status Inicial)")
        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers)
        print(f"✅ Status Inicial: {r.json().get('status')}")

        # [2/4] POST /api/v1/bot/start (Iniciar)
        print("\n[2/4] POST /api/v1/bot/start (Iniciar)")
        r = client.post(f"{BASE_URL}/api/v1/bot/start", headers=headers)
        if r.status_code == 200:
            print(f"✅ Comando Start enviado: {r.json()}")
        else:
            print(f"❌ Falha ao iniciar bot: {r.status_code} - {r.text}")

        # Espera um pouco para o bot inicializar (simula o tempo de bridge)
        time.sleep(2)

        # [3/4] POST /api/v1/bot/restart (Reiniciar)
        print("\n[3/4] POST /api/v1/bot/restart (Reiniciar)")
        r = client.post(f"{BASE_URL}/api/v1/bot/restart", headers=headers)
        if r.status_code == 200:
            print(f"✅ Comando Restart enviado: {r.json()}")
        else:
            print(f"❌ Falha ao reiniciar bot: {r.status_code} - {r.text}")

        time.sleep(2)

        # [4/4] POST /api/v1/bot/stop (Parar)
        print("\n[4/4] POST /api/v1/bot/stop (Parar)")
        r = client.post(f"{BASE_URL}/api/v1/bot/stop", headers=headers)
        if r.status_code == 200:
            print(f"✅ Comando Stop enviado: {r.json()}")
        else:
            print(f"❌ Falha ao parar bot: {r.status_code} - {r.text}")

        # Final check status
        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers)
        print(f"\n🏁 Status Final: {r.json().get('status')}")

if __name__ == "__main__":
    test_bot_control()
