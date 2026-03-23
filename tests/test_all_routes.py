import httpx
import json
import uuid
import time
from datetime import datetime
import subprocess

base_url = "http://76.13.168.200:8001"

def get_auth_token(email, password="TestPassword123!"):
    login_resp = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": email, "password": password}, timeout=30.0)
    if login_resp.status_code == 200:
        return login_resp.json()["access_token"]
    
    print(f"[*] Registrando usuário: {email}")
    register_payload = {
        "email": email,
        "password": password,
        "full_name": "Test User integration",
        "tenant_name": "Tenant Integration"
    }
    httpx.post(f"{base_url}/api/v1/auth/register", json=register_payload, timeout=30.0)
    login_resp = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": email, "password": password}, timeout=30.0)
    return login_resp.json()["access_token"]

def make_superuser(email):
    import psycopg2
    try:
        conn = psycopg2.connect(
            host="76.13.168.200",
            database="saas_omnichannel",
            user="admin",
            password="password123"
        )
        cur = conn.cursor()
        cur.execute(f"UPDATE users SET is_superuser=true WHERE email='{email}';")
        conn.commit()
        cur.close()
        conn.close()
        print(f"[*] Usuário promovido a SuperAdmin: {email}")
    except Exception as e:
        print(f"[!] Falha ao promover usuário via database direta: {e}")

def p(method, url, status, expect=200):
    color = "\033[92m" if status == expect or status in (200, 201, 202) else "\033[91m"
    reset = "\033[0m"
    print(f"[{color}{status}{reset}] {method} {url}")
    return status in (200, 201, 202)

def main():
    print("🚀 Inciando Teste de Roteamento Completo (200 OK) ...\n")
    suffix = str(uuid.uuid4())[:6]
    email = f"integrador_{suffix}@example.com"
    token = get_auth_token(email)
    
    default_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    success_count = 0
    total_count = 0
    failures = []

    def perform(method, path, **kwargs):
        nonlocal success_count, total_count
        headers = kwargs.pop("headers", default_headers)
        resp = httpx.request(method, f"{base_url}{path}", headers=headers, timeout=30.0, **kwargs)
        total_count += 1
        is_ok = p(method.upper(), path, resp.status_code)
        if is_ok:
            success_count += 1
            try:
                return resp.json(), resp
            except Exception:
                return resp.text, resp
        else:
            failures.append((method.upper(), path, resp.status_code, resp.text))
            return None, resp

    print("\n📦 Module: AUTH & USERS")
    perform("get", "/api/v1/auth/me")
    perform("post", "/api/v1/auth/change-password", json={"old_password": "TestPassword123!", "new_password": "ValidPassword1@#A"})
    perform("post", f"/api/v1/auth/password-recovery/{email}")
    
    token = get_auth_token(email, "ValidPassword1@#A")
    default_headers["Authorization"] = f"Bearer {token}"
    
    print("\n💳 Module: BILLING")
    perform("get", "/api/v1/billing/plans")
    perform("get", "/api/v1/billing/my-subscription")
    perform("get", "/api/v1/billing/dashboard")
    
    checkout_data, _ = perform("post", "/api/v1/billing/checkout/1")
    if checkout_data and "external_id" in checkout_data:
        ext_id = checkout_data["external_id"]
        perform("post", "/api/v1/billing/webhook/mercadopago", json={"data": {"id": ext_id}, "status": "approved"})

    perform("get", "/api/v1/billing/my-subscription")

    print("\n🤖 Module: BOT / GATEWAY")
    perform("get", "/api/v1/bot/")
    # Bot start can return 402 if subscription is invalid, but right above we approved it so it should be active.
    # Wait, the bot needs `whatsapp_manager_service` to execute bridge. It might succeed.
    perform("post", "/api/v1/bot/start")
    
    wa_hook = {
        "event": "on_message", "session": "tenant_ignored",
        "payload": {
            "id": "MSG_123", "body": "Ola, suporte", "type": "chat",
            "t": 123456789, "from": "5511999999999", "to": "5511888888888"
        }
    }
    resp = httpx.post(f"{base_url}/api/v1/gateway/webhook/whatsapp", json=wa_hook)
    p("POST", "/api/v1/gateway/webhook/whatsapp (public)", resp.status_code)
    if resp.status_code in (200, 201, 202): success_count += 1
    total_count += 1
    
    print("\n🔀 Module: AUTOMATION FLOWS")
    flow_payload = {"name": "Integration Flow", "nodes": [], "edges": [], "trigger_keywords": ["suporte", "hello"]}
    created_flow, _ = perform("post", "/api/v1/flows/", json=flow_payload)
    perform("get", "/api/v1/flows/")
    
    if created_flow and ("_id" in created_flow or "id" in created_flow):
        fid = created_flow.get("_id") or created_flow.get("id")
        perform("get", f"/api/v1/flows/{fid}")
        perform("patch", f"/api/v1/flows/{fid}", json={"name": "Updated Flow"})
        perform("delete", f"/api/v1/flows/{fid}")
    
    print("\n💬 Module: CHAT & OMNICHANNEL")
    perform("get", "/api/v1/chat/history/5511999999999")
    perform("get", "/api/v1/chat/presence/5511999999999")
    perform("post", "/api/v1/chat/send", json={"phone_number": "5511999999999", "content": "Welcome"})
    perform("post", "/api/v1/chat/typing", params={"is_typing": True, "conversation_id": "5511999999999"})
    perform("post", "/api/v1/chat/transfer/5511999999999", params={"target_agent_id": 1})
    
    print("\n👥 Module: CONTACTS / LEADS")
    perform("get", "/api/v1/contacts/tags")
    perform("get", "/api/v1/contacts/")
    
    # Upload file without application/json Content-Type
    upload_headers = {"Authorization": f"Bearer {token}"}
    perform("post", "/api/v1/contacts/import", headers=upload_headers, files={"file": ("import.csv", b"phone_number,full_name\n5511999999998,Integration Test\n", "text/csv")})
    
    print("\n📢 Module: CAMPAIGNS")
    camp_payload = {"name": "Black Friday Test", "message_template": "Ola {{name}}! Promocao!"}
    c_data, _ = perform("post", "/api/v1/campaigns/", json=camp_payload)
    perform("get", "/api/v1/campaigns/")
    
    if c_data and "id" in c_data:
        cid = c_data["id"]
        schedule_time = datetime.utcnow().isoformat()
        perform("post", f"/api/v1/campaigns/{cid}/schedule", json={"scheduled_at": schedule_time})
        perform("post", f"/api/v1/campaigns/{cid}/pause")
    
    print("\n🛠️ Module: ADMIN")
    # Torne o user superuser antes (PostgreSQL access within container using apt-get installed psql or via python)
    make_superuser(email)
    
    perform("get", "/api/v1/admin/tenants/summary")
    perform("get", "/api/v1/admin/transactions", params={"status": "approved"})
    perform("post", "/api/v1/admin/system/maintenance", params={"enabled": True})
    
    print("\n" + "="*50)
    print(f"📊 SUMMARY: {success_count}/{total_count} routes returned OK (2xx/200).")
    
    for fail in failures:
        print(f"❌ FAILED: {fail[0]} {fail[1]} -> Status {fail[2]}")
        
    if len(failures) == 0:
        print("\n✅ PERFECT! ALL EXECUTED ROUTES WORKED PROPERLY!")

if __name__ == "__main__":
    main()
