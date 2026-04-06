from fastapi import APIRouter
from src.api.v1.endpoints import auth, gateway, ws, flows, chat, bot, billing, campaigns, contacts, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(gateway.router, prefix="/gateway", tags=["gateway"])
api_router.include_router(flows.router, prefix="/flows", tags=["flows"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(bot.router, prefix="/bot", tags=["bot"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ws.router, prefix="/ws", tags=["ws"])
api_router.add_api_websocket_route("/ws", ws.websocket_endpoint)

