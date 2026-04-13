import httpx
import time
from loguru import logger
import json
import os
import sys

# Definimos para usar UTF-8 para evitar problemas de codificação no console
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://76.13.168.200:8001"
EMAIL = "user@example.com"
PASSWORD = "Qwert@3702959"

def test_conversations():
    # 1. Login on API to get the auth token
    login_data = {
        "username": EMAIL,
        "password": PASSWORD
    }
    
    with httpx.Client() as client:
        logger.info(f"[*] Autenticando com o usuário: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        
        if r.status_code != 200:
            print(f"❌ Falha no login: {r.status_code} - {r.text}")
            return
            
        token = r.json().get("access_token")
        if not token:
            print("❌ Falha crítica: 'access_token' não encontrado na resposta.")
            return

        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n🚀 Iniciando Teste de Rotas de Conversas do WhatsApp...\n")
        
        # 1. Testar rota de lista de conversas
        print("[1/2] Disparando GET /api/v1/chat/conversations")
        start_time = time.time()
        
        # O limit=10 fará com que peguemos apenas as 10 mais recentes
        r = client.get(f"{BASE_URL}/api/v1/chat/conversations?limit=10", headers=headers)
        elapsed = time.time() - start_time
        
        if r.status_code != 200:
            print(f"❌ Falha ao buscar lista de conversas. Status: {r.status_code}")
            print(f"Detalhes: {r.text}")
            return
            
        data = r.json()
        conversations = data.get("conversations", [])
        total = data.get("total", 0)
        
        print(f"✅ Sucesso! Recebidas {len(conversations)} conversas do agente (Total em cache: {total}) em {elapsed:.2f}s")
        
        if not conversations:
            print("⚠️ Nenhuma conversa encontrada na sessão do WhatsApp.")
            print("💡 Dica: Verifique se o Bot está ONLINE (status CONNECTED) e se existem conversas na conta.")
            return
            
        # Mostrando as primeiras 5 conversas para conferência
        print("\n📋 Top 5 Conversas mais recentes:")
        for idx, conv in enumerate(conversations[:5]):
            name = conv.get('name') or '(Sem nome definido)'
            unread = conv.get('unread_count', 0)
            is_group = conv.get('is_group')
            group_flag = "[GRUPO] " if is_group else "[PRIVADO] "
            print(f"  {idx+1}. {group_flag}{name}")
            print(f"     JID: {conv.get('id')} | Telefone: {conv.get('phone')} | Não Lidas: {unread}")
            
        # 2. Testar rota do histórico de mensagens para a conversa mais recente
        first_conversation = conversations[0]
        target_jid = first_conversation.get("id")
        
        print(f"\n[2/2] Disparando GET /api/v1/chat/conversations/{target_jid}")
        start_time = time.time()
        
        # Pegamos apenas as 5 últimas mensagens da conversa
        r = client.get(f"{BASE_URL}/api/v1/chat/conversations/{target_jid}?limit=5", headers=headers)
        elapsed = time.time() - start_time
        
        if r.status_code != 200:
            print(f"❌ Falha ao buscar o histórico de mensagens. Status: {r.status_code}")
            print(f"Detalhes: {r.text}")
            return
            
        history_data = r.json()
        messages = history_data.get("messages", [])
        
        print(f"✅ Sucesso! Recebidas {len(messages)} mensagens para o contato ({target_jid}) em {elapsed:.2f}s")
        
        print("\n💬 Últimas Mensagens no Histórico:")
        for msg in messages:
            sender_type = "🤖 Agente/Você" if msg.get("from_me") else "👤 Cliente"
            content = msg.get("content", "")
            msg_type = msg.get("type", "desconhecido")
            msg_status = msg.get("status", "N/A")
            
            # Limitar conteúdo longo
            if content and len(content) > 50:
                content = content[:47] + "..."
                
            print(f"  [{sender_type}] » {content}")
            print(f"      (Tipo: {msg_type} | Status: {msg_status})")
            
        print("\n🏁 Teste concluído com sucesso!")

if __name__ == "__main__":
    test_conversations()
