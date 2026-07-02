# Implementação: Sincronização de Fotos de Perfil (WhatsApp)

Para que o Frontend consuma corretamente as fotos de perfil (tanto dos contatos quanto da própria conta conectada), implementamos a lógica para que o Backend retorne essas URLs de forma nativa e persistida no PostgreSQL.

Aqui está o **walkthrough detalhado** de como o Front-End deve realizar as requisições:

## 1. Foto de Perfil da Própria Conta Conectada (O Robô)
Quando o usuário escaneia o QR Code e o Baileys conecta, o Backend captura a foto do próprio número e a salva. O Frontend pode consultar essa informação através do endpoint de status do bot.

* **Endpoint:** `GET /api/v1/bot/`
* **Headers:** `Authorization: Bearer <seu_token_jwt>`
* **Quando usar:** Na tela de configurações do WhatsApp ou no header do chat para mostrar qual número está ativo.

**Como o Front-End deve tratar a resposta:**
```json
{
  "id": 12,
  "session_name": "tenant_1",
  "status": "CONNECTED",
  "phone_number": "5511999999999",
  "profile_pic_url": "https://pps.whatsapp.net/v/t61.24694-24/...", 
  "sync_progress": 100
}
```
*Ação do Front-End:* Basta ler a propriedade `profile_pic_url`. Se for `null`, o usuário não tem foto ou privou a exibição.

---

## 2. Fotos de Perfil da Lista de Contatos
Durante a sincronização, o Baileys puxa a foto de cada contato e o Backend salva isso no banco de dados (`Contact` model).

* **Endpoint:** `GET /api/v1/contacts/whatsapp`
* **Query Params Opcionais:** `?page=1&limit=50&search=nome_do_contato`
* **Headers:** `Authorization: Bearer <seu_token_jwt>`
* **Quando usar:** Ao carregar a lista lateral de chats (sidebar) ou a agenda de contatos.

**Como o Front-End deve tratar a resposta:**
```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "contacts": [
    {
      "id": 45,
      "phone_number": "5511888888888",
      "full_name": "João Cliente",
      "profile_pic_url": "https://pps.whatsapp.net/v/t61.24694-24/...", 
      "is_group": false
    }
  ]
}
```
*Ação do Front-End:* Ao renderizar a lista, use o `profile_pic_url` na tag `<img>`. Recomendamos colocar uma imagem de fallback (ex: um avatar cinza genérico) caso a propriedade venha como `null`.

---

## 3. Atualização Forçada de Fotos (Refresh)
> [!WARNING]
> As URLs de imagem fornecidas pelos servidores do WhatsApp (`pps.whatsapp.net`) **expiram com o tempo**. 

Se o Front-End notar que as imagens estão quebrando (retornando erro 403/404 no navegador) ou se o usuário quiser forçar a atualização para ver se um cliente trocou de foto, vocês podem usar a rota de refresh.

* **Endpoint:** `POST /api/v1/contacts/refresh-pics`
* **Headers:** `Authorization: Bearer <seu_token_jwt>`
* **Quando usar:** Ao clicar em um botão "Atualizar Fotos" na interface, ou rodar silenciosamente quando o Front-End iniciar ou detectar um erro de imagem.

**Comportamento:**
Como baixar centenas de fotos bloquearia o Backend, este endpoint **responde imediatamente** para o Front-End não ficar travado, enquanto o Baileys trabalha em background atualizando o banco de dados de 5 em 5 contatos.

**Resposta do Backend (imediata):**
```json
{
  "success": true,
  "detail": "Atualização de fotos iniciada em background."
}
```
*Ação do Front-End:* O Front-End pode exibir um aviso de sucesso ("Atualizando fotos em segundo plano..."). O usuário não precisa ficar esperando. Na próxima vez que ele recarregar a tela (ou se o front fizer polling), as URLs novas já virão no `GET /api/v1/contacts/whatsapp`.
