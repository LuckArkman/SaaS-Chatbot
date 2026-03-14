import httpx
import json

base_url = "http://localhost:8000"

def main():
    print("Testing API Routes for 500s...")
    
    # 1. Login
    login_resp = httpx.post(f"{base_url}/api/v1/auth/login", data={"username": "user2@example.com", "password": "Qwert@3702959"})
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return
        
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Get OpenAPI
    openapi = httpx.get(f"{base_url}/api/v1/openapi.json").json()
    paths = openapi.get("paths", {})

    errors_500 = []
    
    # Payload generico
    dummy_payload = {
        "email": "test@example.com", 
        "password": "TestPassword123!", 
        "fullName": "Test User", 
        "tenantName": "Test Tenant",
        "name": "Test Name",
        "content": "Test content",
        "channel_type": "whatsapp",
        "phone_number": "5511999999999",
        "plan": "PRO",
        "is_agent": True,
        "amount": 10.0
    }

    for path, methods in paths.items():
        for method in methods:
            url_path = path
            # replace path params with '1' or dummy UUID
            while "{" in url_path:
                start = url_path.find("{")
                end = url_path.find("}")
                param_name = url_path[start+1:end]
                if param_name == "channel_type":
                    url_path = url_path[:start] + "whatsapp" + url_path[end+1:]
                elif param_name == "email":
                    url_path = url_path[:start] + "user2@example.com" + url_path[end+1:]
                else:
                    url_path = url_path[:start] + "1" + url_path[end+1:]
            
            req_url = f"{base_url}{url_path}"
            
            try:
                if method == "get":
                    r = httpx.get(req_url, headers=headers)
                elif method == "post":
                    r = httpx.post(req_url, headers=headers, json=dummy_payload)
                elif method == "put":
                    r = httpx.put(req_url, headers=headers, json=dummy_payload)
                elif method == "patch":
                    r = httpx.patch(req_url, headers=headers, json=dummy_payload)
                elif method == "delete":
                    r = httpx.delete(req_url, headers=headers)
                
                print(f"{method.upper():<6} {url_path:<40} -> {r.status_code}")
                
                if r.status_code >= 500:
                    errors_500.append((method.upper(), url_path, r.status_code, r.text))
                
            except Exception as e:
                errors_500.append((method.upper(), url_path, "Error", str(e)))

    if errors_500:
        print("\n=== 500 ERRORS FOUND ===")
        for e in errors_500:
            print(f"ROUTE: {e[0]} {e[1]} STATUS: {e[2]}\nERROR: {e[3]}\n")
        exit(1)
    else:
        print("\n=== ALL ROUTES RESPONDED WITHOUT 500 ERRORS! ===")
        exit(0)

if __name__ == "__main__":
    main()
