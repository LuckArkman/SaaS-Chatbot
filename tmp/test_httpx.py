import asyncio
import httpx
from src.main import create_application
from src.core.security import create_access_token

app = create_application()

async def test_api():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        token = create_access_token(subject="1", tenant_id="tenant_1")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test GET
        res = await client.get("/api/v1/campaigns/", headers=headers)
        print("GET /campaigns/ :", res.status_code)
        print(res.text)
        
        # Test POST
        res2 = await client.post("/api/v1/campaigns/", json={"name": "test", "message_template": "hello"}, headers=headers)
        print("POST /campaigns/ :", res2.status_code)
        print(res2.text)

if __name__ == "__main__":
    asyncio.run(test_api())
