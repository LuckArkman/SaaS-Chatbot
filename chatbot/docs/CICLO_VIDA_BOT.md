# Ciclo de Vida do Bot – Checklist

Conforme documentação: sincronização, inicialização, QR Code e health check.

---

## Fluxo implementado

| Etapa | Documentação | Nossa implementação | Status |
|-------|--------------|---------------------|--------|
| **Sincronização** | UI chama `GET /bot/` para verificar instância ativa | Front chama `GET /api/omni/bot/status` → backend chama `GET /api/v1/bot/` | ✅ Feito |
| **Inicialização** | Se desconectado, chama `POST /bot/start` | Front chama `POST /api/omni/bot/start` → backend chama `POST /api/v1/bot/start` | ✅ Feito |
| **QR Code** | Backend retorna `QRCODE` e `qrcode_base64`; front renderiza imagem | Página Chatbots: exibe `<img src="{qrcode_base64}">` quando a API retorna o campo | ✅ Feito |
| **Health Check** | API Python monitora conexão a cada 30s (background task) | Lado da API SaaS; não é implementado no front | ✅ Na API |

---

## Esquema de resposta esperado (WhatsAppInstance)

```json
{
  "session_name": "tenant_8F9D2A",
  "status": "connected",
  "qrcode_base64": "data:image/png;base64,...",
  "battery_level": 85,
  "phone_number": "5511999999999"
}
```

O front trata: `status` (connected / QRCODE / etc.), `qrcode_base64` (exibição do QR). Campos como `session_name`, `battery_level`, `phone_number` podem ser usados na UI se a API enviar.

---

## Como testar

1. Criar usuário programador: abra **`/dev/create-programador`** (ou use o link na tela **Testes de API**).
2. Fazer login com **programador@teste.com** / **Senha123!**.
3. Abrir **`/testes-api`** e usar os botões **Status do bot**, **Iniciar bot**, **Quem sou eu**, **Listar fluxos**, **Listar contatos** para validar as rotas.
4. Na secção **Mídia WhatsApp**, executar as suítes 1–3 (equivalentes a `test_media_and_calls.js`, `test_full_whatsapp_media.js`, `test_api_whatsapp_media.js`).
