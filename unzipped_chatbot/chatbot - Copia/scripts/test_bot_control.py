"""
Teste de ciclo do bot (login → status → start → QR via SSE ou JSON → restart → stop).
Alinhado à API SaaS quando /api/v1/bot/qr passa a responder Server-Sent Events (data: {...}).

Uso:
  pip install httpx pillow pyzbar qrcode loguru
  set BASE_URL=http://76.13.168.200:8001
  set BOT_EMAIL=user@example.com
  set BOT_PASSWORD=secret
  rem opcional: set BOT_QR_SSE_TIMEOUT=180
  python scripts/test_bot_control.py

Para enviar mensagens de chat (não é este script), use:
  python scripts/example_chat_message.py
  (defina CHAT_CONVERSATION_ID — ver docstring nesse ficheiro)
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
from io import BytesIO

import httpx
import qrcode
from loguru import logger
from PIL import Image

try:
    from pyzbar.pyzbar import decode as zbar_decode
except ImportError:
    zbar_decode = None

BASE_URL = os.environ.get("BASE_URL", "http://76.13.168.200:8001").rstrip("/")
EMAIL = os.environ.get("BOT_EMAIL") or os.environ.get("EMAIL", "user@example.com")
PASSWORD = os.environ.get("BOT_PASSWORD") or os.environ.get("PASSWORD", "")
# Tempo máximo a escutar o stream SSE (segundos); alguns bridges demoram >60s
BOT_QR_SSE_TIMEOUT = float(os.environ.get("BOT_QR_SSE_TIMEOUT", "120"))


def _extract_qr_from_dict(data: dict) -> str | None:
    """Procura payload de imagem em várias chaves / aninhamentos comuns na API."""
    if not isinstance(data, dict):
        return None
    for key in ("qrcode_base64", "qrcode", "qr", "qr_code", "qrcode_png"):
        v = data.get(key)
        if isinstance(v, str) and len(v.strip()) > 80:
            return v.strip()
    for nested_key in ("data", "payload", "result", "instance", "whatsapp"):
        nested = data.get(nested_key)
        if isinstance(nested, dict):
            found = _extract_qr_from_dict(nested)
            if found:
                return found
    return None


def _parse_sse_payload_line(line: str) -> dict | None:
    """
    Linha SSE: 'data: {...}' ou 'data:{...}' (com ou sem espaço após os dois pontos).
    """
    s = line.strip()
    if not s.startswith("data:"):
        return None
    payload = s[5:].lstrip()
    if not payload or payload.upper() == "[DONE]":
        return None
    try:
        obj = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def _extract_qr_from_bot_status_payload(data: dict | list) -> str | None:
    """GET /api/v1/bot/ pode devolver lista de instâncias ou um dict com qrcode."""
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                q = _extract_qr_from_dict(item)
                if q:
                    return q
        return None
    if isinstance(data, dict):
        q = _extract_qr_from_dict(data)
        if q:
            return q
        inst = data.get("instances") or data.get("data")
        if isinstance(inst, list):
            return _extract_qr_from_bot_status_payload(inst)
    return None


def fetch_qr_from_bot_endpoint(client: httpx.Client, headers: dict, timeout: float = 30.0) -> str | None:
    """Algumas APIs colocam o QR no GET /api/v1/bot/ em vez de só no stream /bot/qr."""
    try:
        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers, timeout=timeout)
        if r.status_code >= 400:
            return None
        data = r.json()
        return _extract_qr_from_bot_status_payload(data)
    except (httpx.HTTPError, json.JSONDecodeError, ValueError):
        return None


def _print_qr_ascii(b64data: str) -> None:
    pure_b64 = b64data.split(",")[-1] if "," in b64data else b64data
    img_data = base64.b64decode(pure_b64)
    img = Image.open(BytesIO(img_data))
    if zbar_decode:
        decoded_list = zbar_decode(img)
        if decoded_list:
            qr_text = decoded_list[0].data.decode("utf-8")
            qr = qrcode.QRCode()
            qr.add_data(qr_text)
            qr.make()
            print("\n📱 Leia o QR Code abaixo no WhatsApp:\n")
            qr.print_ascii(invert=True)
            return
    print("⚠️ Instale pyzbar para decodificar o PNG (ou escaneie a imagem noutra ferramenta).")


def fetch_qr_via_sse(client: httpx.Client, headers: dict, timeout: float = 90.0) -> tuple[bool, dict | None]:
    """Consome GET /api/v1/bot/qr como stream (linhas `data:` + JSON)."""
    h = {
        **headers,
        # Igual ao proxy PHP: alguns servidores negociam melhor com os dois
        "Accept": "text/event-stream, application/json",
    }
    qr_received = False
    last_qr_content = None
    qr_start_time = None
    last_event: dict | None = None
    try:
        # Timeout elevado no read: o servidor pode ficar silencioso entre eventos SSE
        read_timeout = max(timeout, 30.0)
        stream_timeout = httpx.Timeout(connect=15.0, read=read_timeout, write=30.0, pool=30.0)
        with client.stream(
            "GET",
            f"{BASE_URL}/api/v1/bot/qr",
            headers=h,
            timeout=stream_timeout,
        ) as r:
            if r.status_code >= 400:
                try:
                    body = r.read().decode("utf-8", errors="replace")
                except Exception:
                    body = ""
                logger.warning(f"SSE QR HTTP {r.status_code}: {body[:500]}")
                return False, None
            for line in r.iter_lines():
                if not line:
                    continue
                data = _parse_sse_payload_line(line)
                if not data:
                    s = line.strip()
                    if s.startswith("{"):
                        try:
                            obj = json.loads(s)
                            data = obj if isinstance(obj, dict) else None
                        except json.JSONDecodeError:
                            data = None
                if not data:
                    continue
                last_event = data
                b64data = _extract_qr_from_dict(data)
                status_str = str(data.get("status") or data.get("whatsapp_status") or "").upper()
                if not b64data:
                    if status_str in ("CONNECTED", "DISCONNECTED", "READY"):
                        print(f"\n✅ Fluxo finalizado. Status final: {status_str}")
                        return qr_received, data
                    continue
                if b64data != last_qr_content:
                    if last_qr_content is not None and qr_start_time is not None:
                        elapsed = time.time() - qr_start_time
                        print(f"⏱️ O QR Code anterior demorou {elapsed:.2f} s para expirar/atualizar.")
                    qr_start_time = time.time()
                    last_qr_content = b64data
                    print(f"\n✅ Novo QR Code recebido via streaming! (tamanho: {len(b64data)})")
                    try:
                        _print_qr_ascii(b64data)
                    except Exception as e:
                        print(f"⚠️ Erro ao decodificar QR Code: {e}")
                qr_received = True
    except httpx.HTTPError as e:
        logger.warning(f"Erro no stream QR: {e}")
        return False, None
    if qr_received:
        return True, last_event
    return False, None


def fetch_qr_via_json(client: httpx.Client, headers: dict, timeout: float = 60.0) -> dict | None:
    """Fallback: GET /api/v1/bot/qr com Accept JSON (API mais antiga)."""
    h = {**headers, "Accept": "application/json"}
    r = client.get(f"{BASE_URL}/api/v1/bot/qr", headers=h, timeout=timeout)
    if r.status_code >= 400:
        logger.warning(f"JSON QR HTTP {r.status_code}: {r.text[:500]}")
        return None
    try:
        return r.json()
    except json.JSONDecodeError:
        logger.warning("Resposta QR não é JSON (pode ser SSE sem Accept correto).")
        return None


def poll_bot_status_for_qr(
    client: httpx.Client,
    headers: dict,
    *,
    attempts: int = 15,
    interval_sec: float = 2.0,
) -> str | None:
    """Várias APIs atualizam qrcode_base64 em GET /bot/ antes ou em paralelo ao SSE."""
    for i in range(attempts):
        q = fetch_qr_from_bot_endpoint(client, headers)
        if q:
            print(f"✅ QR obtido em GET /api/v1/bot/ (tentativa {i + 1}/{attempts}, tamanho {len(q)})")
            return q
        time.sleep(interval_sec)
    return None


def test_bot_control() -> None:
    if not PASSWORD:
        print("❌ Defina BOT_PASSWORD (ou PASSWORD) no ambiente.")
        sys.exit(1)

    login_data = {"username": EMAIL, "password": PASSWORD}
    with httpx.Client(timeout=30.0) as client:
        logger.info(f"[*] Autenticando: {EMAIL}")
        r = client.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
        if r.status_code != 200:
            print(f"❌ Falha no login: {r.status_code} - {r.text}")
            return
        token = r.json().get("access_token")
        if not token:
            print("❌ Falha crítica na obtenção do token.")
            return

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        print("\n🚀 Iniciando teste de controle do bot...\n")

        print("[1/4] GET /api/v1/bot/ (status inicial)")
        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers)
        try:
            j = r.json()
            st = j.get("status") if isinstance(j, dict) else None
            if st is None and isinstance(j, list) and j:
                st = j[0].get("whatsapp_status") or j[0].get("status")
            print(f"✅ Status inicial: {st!r} (HTTP {r.status_code})")
        except Exception:
            print(f"✅ Resposta status: HTTP {r.status_code} — {r.text[:300]}")

        print("\n[2/4] POST /api/v1/bot/start")
        r = client.post(f"{BASE_URL}/api/v1/bot/start", headers=headers)
        try:
            print(f"📡 Start ({r.status_code}): {r.json()}")
        except Exception:
            print(f"📡 Start ({r.status_code}): {r.text[:500]}")

        print("⏳ Aguardando 5 s (bridge / browser)...")
        time.sleep(5)

        print("\n[Check] QR Code — tentativa 1: polling GET /api/v1/bot/ (até ~30 s)")
        q_poll = poll_bot_status_for_qr(client, headers, attempts=15, interval_sec=2.0)
        if q_poll:
            try:
                _print_qr_ascii(q_poll)
            except Exception as e:
                print(f"⚠️ Erro ao mostrar QR: {e}")
        else:
            print("ℹ️ QR ainda não veio no status; a seguir: stream /bot/qr.")

        print(f"\n[Check] QR Code — tentativa 2: SSE GET /api/v1/bot/qr (até {BOT_QR_SSE_TIMEOUT:.0f} s)")
        ok_sse, _ = fetch_qr_via_sse(client, headers, timeout=BOT_QR_SSE_TIMEOUT)
        if not ok_sse and not q_poll:
            print("\n[Check] QR Code — tentativa 3: JSON único em /bot/qr")
            data = fetch_qr_via_json(client, headers)
            if data:
                q = _extract_qr_from_dict(data) if isinstance(data, dict) else None
                if q:
                    print(f"✅ QR em JSON (tamanho {len(q)})")
                    try:
                        _print_qr_ascii(q)
                    except Exception as e:
                        print(f"⚠️ {e}")
                else:
                    print(f"⚠️ JSON sem qrcode reconhecível: {str(data)[:400]}…")
            else:
                print(
                    f"❌ Não foi possível obter QR (status /bot/, SSE {BOT_QR_SSE_TIMEOUT:.0f}s, nem JSON). "
                    "Defina BOT_QR_SSE_TIMEOUT=180 ou confira se o bridge gera eventos 'data:' com JSON."
                )
        elif not ok_sse and q_poll:
            print("ℹ️ QR já tinha sido obtido pelo polling; SSE não devolveu novo evento (normal).")

        print("\n[3/4] POST /api/v1/bot/restart")
        r = client.post(f"{BASE_URL}/api/v1/bot/restart", headers=headers)
        try:
            print(f"📡 Restart ({r.status_code}): {r.json()}")
        except Exception:
            print(f"📡 Restart ({r.status_code}): {r.text[:500]}")
        if r.status_code == 404:
            print("ℹ️ Se a SaaS não expuser /bot/restart, ignore este passo.")

        time.sleep(2)

        print("\n[4/4] POST /api/v1/bot/stop")
        r = client.post(f"{BASE_URL}/api/v1/bot/stop", headers=headers)
        try:
            print(f"📡 Stop ({r.status_code}): {r.json()}")
        except Exception:
            print(f"📡 Stop ({r.status_code}): {r.text[:500]}")

        r = client.get(f"{BASE_URL}/api/v1/bot/", headers=headers)
        data = r.json()

        def _fmt_final_row(row: dict) -> str:
            st = row.get("whatsapp_status") or row.get("status")
            parts = [f"status={st!r}"]
            if row.get("id") is not None:
                parts.append(f"id={row.get('id')}")
            if row.get("session_name"):
                parts.append(f"session_name={row.get('session_name')!r}")
            qb = row.get("qrcode_base64") or row.get("qrcode")
            if isinstance(qb, str) and len(qb) > 0:
                parts.append(f"qrcode_base64=<{len(qb)} chars>")
            return " — ".join(parts)

        if isinstance(data, list) and len(data) > 0:
            print(f"\n🏁 Status final: {_fmt_final_row(data[0])}")
        elif isinstance(data, dict):
            if isinstance(data.get("instances"), list) and data["instances"]:
                print(f"\n🏁 Status final: {_fmt_final_row(data['instances'][0])}")
            else:
                print(f"\n🏁 Status final: {_fmt_final_row(data)}")
        else:
            print(f"\n🏁 Status final: {data}")


if __name__ == "__main__":
    test_bot_control()
