"""
Exemplo mínimo: autenticar na API SaaS e enviar/receber mensagens de chat.

Swagger: http://76.13.168.200:8001/docs

  - POST /api/v1/chat/send     — JSON: {"conversation_id": "...", "content": "..."}
  - GET  /api/v1/chat/history/{conversation_id}
  - POST /api/v1/chat/typing   — query: conversation_id, is_typing (sem corpo)

O script test_bot_control.py trata do *bot* (WhatsApp QR, start/stop). Este ficheiro trata do *chat*.

Uso:
  pip install httpx loguru
  set BASE_URL=http://76.13.168.200:8001
  set BOT_EMAIL=user@example.com
  set BOT_PASSWORD=...
  set CHAT_CONVERSATION_ID=<id da conversa>
  python scripts/example_chat_message.py

Opcional: set CHAT_MESSAGE=Olá
"""
from __future__ import annotations

import os
import sys
from urllib.parse import quote

import httpx
from loguru import logger

BASE_URL = os.environ.get("BASE_URL", "http://76.13.168.200:8001").rstrip("/")
EMAIL = os.environ.get("BOT_EMAIL") or os.environ.get("EMAIL", "user@example.com")
PASSWORD = os.environ.get("BOT_PASSWORD") or os.environ.get("PASSWORD", "")
CONV_ID = os.environ.get("CHAT_CONVERSATION_ID", "").strip()
MESSAGE = os.environ.get("CHAT_MESSAGE", "Mensagem de teste via example_chat_message.py").strip()


def main() -> None:
    if not PASSWORD:
        print("❌ Defina BOT_PASSWORD (ou PASSWORD).")
        sys.exit(1)
    if not CONV_ID:
        print("❌ Defina CHAT_CONVERSATION_ID (ID da conversa na API).")
        sys.exit(1)

    cid_path = quote(str(CONV_ID), safe="")

    login_data = {"username": EMAIL, "password": PASSWORD}
    with httpx.Client(timeout=30.0) as client:
        logger.info(f"[*] Login: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        if r.status_code != 200:
            print(f"❌ Login falhou: {r.status_code} — {r.text[:500]}")
            sys.exit(1)
        token = r.json().get("access_token")
        if not token:
            print("❌ Sem access_token na resposta.")
            sys.exit(1)

        headers_json = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        headers_bearer = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

        print("\n--- GET /api/v1/chat/history/{conversation_id} ---")
        rh = client.get(f"{BASE_URL}/api/v1/chat/history/{cid_path}", headers=headers_bearer)
        print(f"HTTP {rh.status_code}: {rh.text[:800]}{'…' if len(rh.text) > 800 else ''}")

        print("\n--- POST /api/v1/chat/typing (query; OpenAPI SaaS) ---")
        rt = client.post(
            f"{BASE_URL}/api/v1/chat/typing",
            params={"conversation_id": CONV_ID, "is_typing": True},
            headers=headers_bearer,
        )
        print(f"HTTP {rt.status_code}: {rt.text[:400]}")

        print("\n--- POST /api/v1/chat/send ---")
        payload = {"conversation_id": CONV_ID, "content": MESSAGE}
        rs = client.post(f"{BASE_URL}/api/v1/chat/send", headers=headers_json, json=payload)
        print(f"HTTP {rs.status_code}: {rs.text[:800]}{'…' if len(rs.text) > 800 else ''}")

        client.post(
            f"{BASE_URL}/api/v1/chat/typing",
            params={"conversation_id": CONV_ID, "is_typing": False},
            headers=headers_bearer,
        )

        print("\n--- GET histórico (depois de enviar) ---")
        rh2 = client.get(f"{BASE_URL}/api/v1/chat/history/{cid_path}", headers=headers_bearer)
        print(f"HTTP {rh2.status_code}: {rh2.text[:800]}{'…' if len(rh2.text) > 800 else ''}")

        print("\n✅ Concluído. No painel PHP o mesmo fluxo usa:")
        print("   POST …/public/api/omni/chat/send  com JSON { conversation_id, content }")
        print("   (o proxy PHP chama a SaaS em /api/v1/chat/send com o teu token de sessão)")


if __name__ == "__main__":
    main()
