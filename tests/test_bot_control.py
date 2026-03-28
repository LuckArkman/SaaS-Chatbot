import httpx
import time
import base64
from io import BytesIO
from PIL import Image
from pyzbar.pyzbar import decode
import qrcode
from loguru import logger
import uuid

BASE_URL = "http://76.13.168.200:8001"
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
        print("\n[Check] Buscando QR Code (aguardando geração via SSE/Streaming)...")
        qr_received = False
        last_qr_content = None
        qr_start_time = None
        
        try:
            with client.stream("GET", f"{BASE_URL}/api/v1/bot/qr", headers=headers, timeout=60.0) as r:
                for line in r.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    
                    import json
                    try:
                        data = json.loads(line[6:])
                        b64data = data.get('qrcode')
                        status_str = data.get('status')
                    except Exception:
                        continue
                        
                    if not b64data:
                        if status_str in ["CONNECTED", "DISCONNECTED"]:
                            print(f"\n✅ Fluxo finalizado. Status final: {status_str}")
                            break
                        continue
                        
                    if b64data != last_qr_content:
                        if last_qr_content is not None and qr_start_time is not None:
                            elapsed = time.time() - qr_start_time
                            print(f"⏱️ O QR Code anterior demorou {elapsed:.2f} segundos para expirar/atualizar.")
                        
                        qr_start_time = time.time()
                        last_qr_content = b64data
                        
                        print(f"\n✅ Novo QR Code recebido via Streaming! (tamanho: {len(b64data)})")
                        
                        # Tenta decodificar o PNG e imprimir
                        try:
                            pure_b64 = b64data.split(",")[-1] if "," in b64data else b64data
                            img_data = base64.b64decode(pure_b64)
                            img = Image.open(BytesIO(img_data))
                            
                            decoded_list = decode(img)
                            if decoded_list:
                                qr_text = decoded_list[0].data.decode('utf-8')
                                qr = qrcode.QRCode()
                                qr.add_data(qr_text)
                                qr.make()
                                print("\n📱 Leia o QR Code abaixo no WhatsApp:\n")
                                qr.print_ascii(invert=True)
                            else:
                                print("⚠️ Não foi possível encontrar um QR Code válido na imagem (Base64 corrompido ou baixa resolução).")
                        except Exception as e:
                            print(f"⚠️ Erro ao decodificar QR Code: {e}")
                    
                    qr_received = True
        except Exception as e:
            print(f"❌ Erro durante o stream: {e}")
        
        if not qr_received:
            print("❌ Falha ao obter QR Code após 60 segundos.")

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
