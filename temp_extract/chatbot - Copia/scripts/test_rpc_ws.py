#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste da rota WebSocket RPC da API SaaS (JSON-RPC sobre WS).

URI (igual ao exemplo clássico):
  ws://HOST:PORT/api/v1/ws?token=JWT

Fluxo RPC (o script faz isto por ti, com fila de leitura para não perder pushes):
  1) {"method": "ping", "id": "<uuid>"}
  2) {"method": "set_typing", "id": "<uuid>", "params": {"conversation_id": "...", "is_typing": true}}
  3) {"method": "send_message", "id": "<uuid>", "params": {"conversation_id": "...", "content": "..."}}
  4) loop opcional: recv → notificações com "method" / respostas com "id"+"result"
     (ex.: push {"method": "receive_message", "params": { "conversation_id": "5511...@s.whatsapp.net",
     "contact_phone": "5511...", "contact": {"id","full_name","phone_number"}, "content", ... }} — sem "id"

NÃO use GET HTTP a /api/v1/ws/ no dev/call — a SaaS só aceita upgrade WebSocket.

Integração: consola programador ou /testes-api#ws-rpc

Dependência:
  pip install websockets

Exemplos:
  python scripts/test_rpc_ws.py --host 76.13.168.200 --port 8001 --token "SEU_JWT" --conversation-id 5511999999999 --listen
  python scripts/test_rpc_ws.py --token "$env:SAAS_JWT" --conversation-id test_conv --listen-only
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import os
import sys
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional, Tuple


class MsgKind(str, Enum):
    JSONRPC_RESPONSE = "jsonrpc_response"  # id + result | error (resposta a um pedido nosso)
    JSONRPC_REQUEST = "jsonrpc_request"  # method + id (pedido do servidor)
    JSONRPC_NOTIFICATION = "jsonrpc_notification"  # method, sem id
    JSON_OBJECT = "json_object"  # JSON que não encaixa no padrão acima
    RAW_TEXT = "raw_text"  # não é JSON


@dataclass
class Classified:
    kind: MsgKind
    raw: str
    data: Any  # dict ou str


def classify_message(raw: str) -> Classified:
    text = raw.strip() if isinstance(raw, str) else str(raw)
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return Classified(MsgKind.RAW_TEXT, raw, text)

    if not isinstance(obj, dict):
        return Classified(MsgKind.JSON_OBJECT, raw, obj)

    has_id = "id" in obj
    has_method = "method" in obj
    has_result = "result" in obj
    has_error = "error" in obj

    if has_id and (has_result or has_error) and not has_method:
        return Classified(MsgKind.JSONRPC_RESPONSE, raw, obj)
    if has_method and has_id:
        return Classified(MsgKind.JSONRPC_REQUEST, raw, obj)
    if has_method and not has_id:
        return Classified(MsgKind.JSONRPC_NOTIFICATION, raw, obj)
    return Classified(MsgKind.JSON_OBJECT, raw, obj)


def _pretty(obj: Any) -> str:
    try:
        return json.dumps(obj, indent=2, ensure_ascii=False, default=str)
    except TypeError:
        return repr(obj)


def print_banner(title: str) -> None:
    line = "═" * min(64, max(40, len(title) + 8))
    print(f"\n{line}\n  {title}\n{line}")


def print_classified(c: Classified, index: Optional[int] = None) -> None:
    prefix = f"[#{index}] " if index is not None else ""
    if c.kind == MsgKind.JSONRPC_RESPONSE:
        d = c.data
        rid = d.get("id")
        if "error" in d:
            err = d["error"]
            print(f"{prefix}← RPC RESPOSTA (erro)  id={rid}")
            print(_pretty(err if not isinstance(err, (dict, list)) or err else d))
        else:
            print(f"{prefix}← RPC RESPOSTA (ok)     id={rid}")
            print(_pretty(d.get("result", d)))
        return

    if c.kind == MsgKind.JSONRPC_REQUEST:
        d = c.data
        print(f"{prefix}← PEDIDO DO SERVIDOR     method={d.get('method')!r} id={d.get('id')}")
        if d.get("params") is not None:
            print("   params:")
            print(_pretty(d["params"]))
        return

    if c.kind == MsgKind.JSONRPC_NOTIFICATION:
        d = c.data
        print(f"{prefix}← NOTIFICAÇÃO (push)     method={d.get('method')!r}")
        if d.get("params") is not None:
            print("   params:")
            print(_pretty(d["params"]))
        return

    if c.kind == MsgKind.JSON_OBJECT:
        print(f"{prefix}← JSON")
        print(_pretty(c.data))
        return

    print(f"{prefix}← TEXTO / binário legível")
    preview = c.raw if len(c.raw) < 4000 else c.raw[:4000] + "\n… [truncado]"
    print(preview)


async def ws_reader(
    websocket: Any,
    queue: "asyncio.Queue[Tuple[str, Any]]",
) -> None:
    try:
        async for message in websocket:
            await queue.put(("msg", message))
    except Exception as e:  # noqa: BLE001 — queremos propagar qualquer falha de socket
        await queue.put(("fatal", e))


async def recv_next(
    queue: "asyncio.Queue[Tuple[str, Any]]",
    timeout: float,
) -> str:
    kind, payload = await asyncio.wait_for(queue.get(), timeout=timeout)
    if kind == "fatal":
        raise payload
    return payload if isinstance(payload, str) else str(payload)


async def recv_next_wait_forever(queue: "asyncio.Queue[Tuple[str, Any]]") -> str:
    kind, payload = await queue.get()
    if kind == "fatal":
        raise payload
    return payload if isinstance(payload, str) else str(payload)


async def wait_for_rpc_id(
    queue: "asyncio.Queue[Tuple[str, Any]]",
    expected_id: str,
    overall_timeout: float = 30.0,
) -> Classified:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + overall_timeout
    extra_idx = 0
    while True:
        remaining = deadline - loop.time()
        if remaining <= 0:
            raise TimeoutError(f"Timeout à espera de resposta RPC com id={expected_id!r}")
        raw = await recv_next(queue, min(remaining, 25.0))
        c = classify_message(raw)
        if c.kind == MsgKind.JSONRPC_RESPONSE and str(c.data.get("id")) == str(expected_id):
            return c
        extra_idx += 1
        print_classified(c, index=extra_idx)


async def run_tests(
    uri: str,
    conversation_id: str,
    message_text: str,
    skip_demo: bool,
    listen_only: bool,
    listen_forever: bool,
) -> None:
    try:
        import websockets
    except ImportError:
        print("Instale: pip install websockets", file=sys.stderr)
        sys.exit(1)

    print_banner("Ligação WebSocket")
    print(f"URI (sem token completo): {uri.split('token=')[0]}token=***")

    async with websockets.connect(uri, max_size=None) as websocket:
        print("Conexão estabelecida (WebSocket). RPC JSON em texto UTF-8.\n")

        queue: asyncio.Queue[Tuple[str, Any]] = asyncio.Queue()
        reader_task = asyncio.create_task(ws_reader(websocket, queue))

        try:
            if listen_only:
                print_banner("Modo só escuta (Ctrl+C para sair)")
                idx = 0
                while True:
                    raw = await recv_next_wait_forever(queue)
                    idx += 1
                    print_classified(classify_message(raw), index=idx)

            if not skip_demo:
                # --- ping ---
                ping_id = str(uuid.uuid4())
                ping_request = {"method": "ping", "id": ping_id}
                print_banner("1) RPC ping")
                print("→ Enviado:", _pretty(ping_request))
                await websocket.send(json.dumps(ping_request))
                c = await wait_for_rpc_id(queue, ping_id)
                print_classified(c)

                # --- set_typing ---
                typing_id = str(uuid.uuid4())
                typing_request = {
                    "method": "set_typing",
                    "id": typing_id,
                    "params": {
                        "conversation_id": conversation_id,
                        "is_typing": True,
                    },
                }
                print_banner("2) RPC set_typing")
                print("→ Enviado:", _pretty(typing_request))
                await websocket.send(json.dumps(typing_request))
                c = await wait_for_rpc_id(queue, typing_id)
                print_classified(c)

                # --- send_message ---
                msg_id = str(uuid.uuid4())
                msg_request = {
                    "method": "send_message",
                    "id": msg_id,
                    "params": {
                        "conversation_id": conversation_id,
                        "content": message_text,
                    },
                }
                print_banner("3) RPC send_message")
                print("→ Enviado:", _pretty(msg_request))
                await websocket.send(json.dumps(msg_request))
                c = await wait_for_rpc_id(queue, msg_id)
                print_classified(c)

            print_banner("Escuta de push / mensagens assíncronas")
            if listen_forever:
                print("(Ctrl+C para encerrar)\n")
                idx = 0
                while True:
                    raw = await recv_next_wait_forever(queue)
                    idx += 1
                    print_classified(classify_message(raw), index=idx)
            else:
                print("Nada mais a escutar (use --listen ou --listen-only para manter aberto).\n")

        finally:
            reader_task.cancel()
            try:
                await reader_task
            except asyncio.CancelledError:
                pass


def build_uri(host: str, port: int, path: str, token: str, use_tls: bool) -> str:
    scheme = "wss" if use_tls else "ws"
    p = (path or "/api/v1/ws").strip()
    p = "/" + p.lstrip("/")
    p = p.rstrip("/") or "/"
    p = re.sub(r"/+", "/", p)
    from urllib.parse import quote

    tok = quote(token.strip(), safe="")
    return f"{scheme}://{host}:{port}{p}?token={tok}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Teste JSON-RPC via WebSocket (/api/v1/ws?token=…)",
    )
    parser.add_argument("--host", default="76.13.168.200", help="Host da API SaaS")
    parser.add_argument("--port", type=int, default=8001, help="Porta")
    parser.add_argument("--path", default="/api/v1/ws", help="Path do WebSocket")
    parser.add_argument(
        "--token",
        default="",
        help="JWT (login na SaaS). Se vazio, usa variável de ambiente SAAS_JWT ou OMNI_TOKEN.",
    )
    parser.add_argument("--wss", action="store_true", help="Usar wss:// em vez de ws://")
    parser.add_argument(
        "--conversation-id",
        default="test_conv",
        help="conversation_id para set_typing e send_message",
    )
    parser.add_argument(
        "--message",
        default="SaaS Chatbot — teste RPC via WebSocket",
        help="Texto de send_message",
    )
    parser.add_argument(
        "--skip-demo",
        action="store_true",
        help="Não enviar ping/set_typing/send_message; só escutar",
    )
    parser.add_argument(
        "--listen-only",
        action="store_true",
        help="Equivalente a --skip-demo + escuta contínua desde o início",
    )
    parser.add_argument(
        "--listen",
        action="store_true",
        help="Após o demo, manter escuta aberta até Ctrl+C",
    )
    args = parser.parse_args()

    token = (args.token or "").strip() or os.environ.get("SAAS_JWT", "").strip() or os.environ.get("OMNI_TOKEN", "").strip()
    if not token:
        print(
            "Indique --token ou defina SAAS_JWT / OMNI_TOKEN no ambiente.",
            file=sys.stderr,
        )
        sys.exit(1)

    uri = build_uri(args.host, args.port, args.path, token, args.wss)
    listen_only = args.listen_only
    skip_demo = args.skip_demo or listen_only
    listen_forever = args.listen or listen_only

    try:
        asyncio.run(
            run_tests(
                uri=uri,
                conversation_id=args.conversation_id,
                message_text=args.message,
                skip_demo=skip_demo,
                listen_only=listen_only,
                listen_forever=listen_forever,
            )
        )
    except KeyboardInterrupt:
        print("\n[*] Interrompido pelo utilizador.")
        sys.exit(0)
    except TimeoutError as e:
        print(f"\n❌ Timeout: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:  # noqa: BLE001
        print(f"\n❌ Erro: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
