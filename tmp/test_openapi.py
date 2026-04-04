import json
from src.main import create_application

app = create_application()
openapi = app.openapi()
paths = openapi.get("paths", {})
get_campaigns = paths.get("/api/v1/campaigns/", {}).get("get", {})
print("GET /campaigns parameters:")
print(json.dumps(get_campaigns.get("parameters", []), indent=2))
