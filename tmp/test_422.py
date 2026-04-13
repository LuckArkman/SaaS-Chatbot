from src.main import create_application
import json

app = create_application()
openapi = app.openapi()

paths = openapi.get("paths", {})

campaigns_paths = {k: v for k, v in paths.items() if "/api/v1/campaigns" in k}
print(json.dumps(campaigns_paths, indent=2))
