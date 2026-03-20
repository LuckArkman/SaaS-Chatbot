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
        print(f"📡 Resposta Start ({r.status_code}): {r.json()}")

        # Espera um pouco para o bot inicializar (simula o tempo de bridge)
        print("⏳ Aguardando 5s para inicialização do Puppeteer...")
        time.sleep(5)

        # [Check QR]
        print("\n[Check] Buscando QR Code (se disponível)...")
        r = client.get(f"{BASE_URL}/api/v1/bot/qr", headers=headers)
        if r.status_code == 200:
            print(f"✅ QR Code recebido (tamanho: {len(r.json().get('qrcode', ''))})")
        else:
            print(f"ℹ️ QR Code ainda não disponível: {r.status_code} - {r.json().get('detail')}")

        # [3/4] POST /api/v1/bot/restart (Reiniciar)
        print("\n[3/4] POST /api/v1/bot/restart (Reiniciar)")
        r = client.post(f"{BASE_URL}/api/v1/bot/restart", headers=headers)
        print(f"📡 Resposta Restart ({r.status_code}): {r.json()}")

        time.sleep(2)

        # [4/4] POST /api/v1/bot/stop (Parar)
        print("\n[4/4] POST /api/v1/bot/stop (Parar)")
        r = client.post(f"{BASE_URL}/api/v1/bot/stop", headers=headers)
        print(f"📡 Resposta Stop ({r.status_code}): {r.json()}")

        # Final check status
        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers)
        data = r.json()
        if isinstance(data, list) and len(data) > 0:
            print(f"\n🏁 Status Final: {data[0].get('whatsapp_status')}")
        else:
            print(f"\n🏁 Status Final: Nenhuma instância retornada - {data}")

if __name__ == "__main__":
    test_bot_control()
