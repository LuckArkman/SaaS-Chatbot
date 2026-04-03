import requests
import json

URL = "http://localhost:8000/api/v1/gateway/webhook/whatsapp"
HEADERS = {
    "x-api-key": "SaaS_Secret_Gateway_Key_2026",
    "Content-Type": "application/json"
}

def test_payload(name, payload):
    print(f"Testing {name}...")
    try:
        response = requests.post(URL, json=payload, headers=HEADERS)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        if response.status_code == 202:
            print(f"✅ {name} PASSED")
        else:
            print(f"❌ {name} FAILED with status {response.status_code}")
    except Exception as e:
        print(f"💥 Error testing {name}: {e}")
    print("-" * 30)

# Payload 1: Canonical Bridge Format
payload1 = {
    "event": "on_message",
    "session": "tenant_test_123",
    "payload": {
        "id": "MSG_ID_001",
        "from": "5511999999999@s.whatsapp.net",
        "body": "Hello from Test Script!",
        "type": "chat",
        "timestamp": 1672531200
    }
}

# Payload 2: Flat Format (Used by some sims or older logic)
payload2 = {
    "event": "messages.upsert",
    "data": {
        "id": "MSG_ID_002",
        "body": "Flat payload test",
        "from": "5511888888888"
    },
    "tenant_id": "test_tenant_xyz"
}

# Payload 3: Minimal state change
payload3 = {
    "event": "on_state_change",
    "session": "tenant_test_123",
    "payload": {
        "state": "CONNECTED"
    }
}

if __name__ == "__main__":
    test_payload("Canonical Format", payload1)
    test_payload("Flat Format", payload2)
    test_payload("State Change", payload3)
