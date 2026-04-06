import asyncio
import websockets
import json
import uuid
import sys
import argparse

"""
Script de Teste para Rota RPC via WebSocket.
Uso: python test_rpc_ws.py --host 76.13.168.200 --port 8001 --token <JWT_TOKEN>
"""

async def test_rpc_ws(host, port, token):
    uri = f"ws://{host}:{port}/api/v1/ws?token={token}"
    print(f"[*] Conectando em {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Conexão estabelecida!")
            
            # --- 1. Testar PING (RPC) ---
            ping_id = str(uuid.uuid4())
            ping_request = {
                "method": "ping",
                "id": ping_id
            }
            print(f"\n[📤] Enviando Ping (id={ping_id})...")
            await websocket.send(json.dumps(ping_request))
            
            response = await websocket.recv()
            print(f"[📥] Resposta Recebida: {response}")
            
            # --- 2. Testar SET_TYPING (RPC) ---
            typing_id = str(uuid.uuid4())
            typing_request = {
                "method": "set_typing",
                "id": typing_id,
                "params": {
                    "conversation_id": "test_conv",
                    "is_typing": True
                }
            }
            print(f"\n[📤] Enviando set_typing (id={typing_id})...")
            await websocket.send(json.dumps(typing_request))
            
            response = await websocket.recv()
            print(f"[📥] Resposta Recebida: {response}")
            
            # --- 3. Testar SEND_MESSAGE (RPC) ---
            msg_id = str(uuid.uuid4())
            msg_request = {
                "method": "send_message",
                "id": msg_id,
                "params": {
                    "conversation_id": "5511999999999", # Troque por um numero real
                    "content": "SaaS Chatbot - Teste de RPC via WebSocket 🚀"
                }
            }
            print(f"\n[📤] Enviando send_message (id={msg_id})...")
            await websocket.send(json.dumps(msg_request))
            
            # Espera a resposta do enfileiramento RPC
            response = await websocket.recv()
            print(f"[📥] Resposta RPC (Queue): {response}")
            
            # --- 4. Loop para escutar notificações (Push) ---
            print("\n[*] Entrando em modo de escuta para notificações assíncronas (Pushed RPC)...")
            print("[*] (Pressione Ctrl+C para encerrar)")
            
            while True:
                notify = await websocket.recv()
                data = json.loads(notify)
                
                # Se for uma notificação puxada pelo servidor
                if "method" in data:
                    method = data.get("method")
                    params = data.get("params", {})
                    print(f"\n[🔔 NOTIFICAÇÃO] Método: {method}")
                    print(f"      Conteúdo: {json.dumps(params, indent=6)}")
                else:
                    print(f"\n[📥 MENSAGEM RAW] {notify}")

    except Exception as e:
        print(f"❌ Erro fatal: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste de RPC via WebSocket")
    parser.add_argument("--host", default="76.13.168.200", help="IP da VPS")
    parser.add_argument("--port", default="8001", help="Porta do Backend")
    parser.add_argument("--token", required=True, help="Token JWT de Acesso")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(test_rpc_ws(args.host, args.port, args.token))
    except KeyboardInterrupt:
        print("\n[*] Teste encerrado pelo usuário.")
        sys.exit(0)
