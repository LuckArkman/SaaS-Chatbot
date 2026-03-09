import asyncio
import httpx
import time
import uuid

# Configurações do Teste
# Em produção, aponte para a URL da sua VPS: e.g. http://62.72.61.121:8000
BASE_URL = "http://localhost:8000/api/v1/gateway/webhook/whatsapp"
API_KEY = "SaaS_Secret_Gateway_Key_2026" # Definida em gateway.py
TOTAL_MESSAGES = 500
CONCURRENCY = 50

async def send_message(client, i):
    payload = {
        "event": "on_message",
        "session": "test-session",
        "payload": {
            "id": str(uuid.uuid4()),
            "body": f"Mensagem Stress Teste {i}",
            "from": "+5511999999999@c.us",
            "to": "+5511888888888@c.us",
            "type": "chat",
            "t": int(time.time()),
            "isGroupMsg": False
        }
    }
    
    try:
        start = time.perf_counter()
        headers = {"X-API-KEY": API_KEY}
        response = await client.post(BASE_URL, json=payload, headers=headers)
        duration = time.perf_counter() - start
        return response.status_code, duration
    except Exception as e:
        return 500, 0

async def run_benchmark():
    print(f"🚀 Iniciando Benchmark do Gateway: {TOTAL_MESSAGES} mensagens, Concorrência de {CONCURRENCY}")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        # Semáforo para limitar concorrência
        sem = asyncio.Semaphore(CONCURRENCY)
        
        async def limited_send(i):
            async with sem:
                return await send_message(client, i)
        
        start_time = time.perf_counter()
        results = await asyncio.gather(*[limited_send(i) for i in range(TOTAL_MESSAGES)])
        total_duration = time.perf_counter() - start_time
        
        # Análise básica
        success = [r for r in results if r[0] == 202]
        failed = [r for r in results if r[0] != 202]
        latencies = [r[1] for r in results if r[1] > 0]
        
        print("\n📊 RESULTADOS DO BENCHMARK:")
        print(f"✅ Sucessos: {len(success)}")
        print(f"❌ Falhas: {len(failed)}")
        print(f"🕒 Duração Total: {total_duration:.2f}s")
        print(f"📦 Vazão (Throughput): {len(success) / total_duration:.2f} msg/s")
        if latencies:
            print(f"⚡ Latência Média: {sum(latencies)/len(latencies)*1000:.2f}ms")

if __name__ == "__main__":
    # Certifique-se de que o servidor FastAPI e o RabbitMQ estão rodando
    try:
        asyncio.run(run_benchmark())
    except Exception as e:
        print(f"Erro ao rodar benchmark: {e}. Certifique-se que 'httpx' está instalado (pip install httpx)")
