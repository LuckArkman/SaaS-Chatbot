# Análise Minuciosa de Propagação (PUT /whatsapp/{phone})

Abaixo encontra-se a análise ponto a ponto de **todo o trajeto de comunicação** da rota que deveria atualizar os dados do contato. O documento destrincha o porquê da informação falhar ao atingir o banco de dados (PostgreSQL) e o porquê de também falhar ao refletir no WhatsApp Web (através do Baileys).

## 1. O Trajeto no Backend (Python FastAPI)
Quando o front-end envia o novo nome para atualizar um contato, ele dispara uma requisição HTTP `PUT` para:
`/api/v1/contacts/whatsapp/{phone}`

A assinatura do método que recebe a requisição é:
```python
async def edit_whatsapp_contact(
    phone: str,
    payload: WhatsAppContactAdd,  # Schema Pydantic
    db: Session = Depends(get_db), ...
)
```

### 🛑 Motivo 1: Falha na normalização e Validation Errors (PostgreSQL não atualiza)
O schema `WhatsAppContactAdd` exige **obrigatoriamente** o campo `phone` no corpo da requisição (JSON body), porém a rota já exige o `phone` na própria URL. 
Caso o front-end envie apenas `{"name": "Novo Nome"}` sem o telefone no payload JSON, o servidor abortará a requisição instantaneamente retornando um erro `422 Unprocessable Entity`. Logo, a execução é interrompida antes mesmo de atingir a lógica do Python.

Mas supondo que o front-end mande o `phone` correto no body. Veja o que acontece ao processar a consulta no banco de dados na linha 282:

```python
normalized_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
existing = db.query(Contact).filter(
    Contact.tenant_id == tenant_id,
    Contact.phone_number == normalized_phone,
).first()
```
Se a URL contiver o JID completo (ex: `5511999999999@s.whatsapp.net`), o método `.replace()` **NÃO removerá** o `@s.whatsapp.net`. Consequentemente, o Postgres procurará o contato no banco com essa formatação. Sabendo que o contato real foi salvo apenas com números em insertos passados, a query resultará em nulo (não encontrará). Quando o ORM não encontra o registro existente, o bloco da condicional gera a criação de um "novo" contato corrompido. O contato original nunca será atualizado na base.

---

## 2. O Trajeto na Bridge Intermediária (Client de Rede Python)
O Python chama o Serviço: `whatsapp_bridge.edit_contact(session_id, phone, name)`
Em `src/services/whatsapp_bridge_service.py`, uma requisição HTTP `PUT` assíncrona é enviada para a ponte em Node.js (via pacote Httpx). O pacote viaja até a ponte sem problemas detectados nesta malha.

---

## 3. O Trajeto na Instância Node.js (Baileys)
A requisição chega ao lado Node.js no endpoint:
`app.put('/contacts/edit', async (req, res) => { ... })`

Dentro desta rota de update do contato, a Engine Bridge executa:
```javascript
const normalizedPhone = phone.replace(/[^0-9+]/g, '');
const jid = `${normalizedPhone}@s.whatsapp.net`;

if (sock.store && sock.store.contacts) {
    sock.store.contacts[jid] = { 
        ...(sock.store.contacts[jid] || { id: jid }), 
        name: name,
        notify: name
    };
}
```

### 🛑 Motivo 2: Arquitetura de Espelhamento do Baileys e Limitação da API do WhatsApp
1. **Cache Local Transitório (`sock.store`):** A variável `store` é uma estrutura do tipo `ManualStore` montada em memória dinâmica puramente para armazenar cópias espelho momentâneas do evento `contacts.set`. Isso não é um banco em disco! Ao modificar `sock.store.contacts[jid]`, você atualiza somente o *objeto Javascript* da memória RAM onde a sessão do Baileys está rodando. Assim que você restartar o arquivo Node.js, todas as modificações que não vêm diretamente do celular **deixarão de existir e resetarão**.
2. **Propagação Inexistente na Base WhatsApp:** O protocolo não-oficial do WhatsApp Web atua primariamente como uma sessão passiva de *espelhamento*. Apenas os aparelhos Mobile possuem permissão root global para alterar os contatos da agenda Google/Apple acoplada ao WhatsApp do aparelho. **O Baileys nativamente não possui a capacidade de alterar e sincronizar a agenda do celular pelo web socket.**

## 🛠️ Resumo das Soluções e Próximos Passos
Para corrigir esse fluxo nós precisamos:

1. **Resolver a Incompatibilidade do Endpoint:** No backend FastAPI, devemos dissociar o modelo substituindo `WhatsAppContactAdd` por `WhatsAppContactUpdate` (para remover a exigência do phone no body). Além disso, a normalização de URL deve aplicar um RegEx ou `re.sub(r'\D', '', phone)` limpando @s.whatsapp.net antes do PGSQL.
2. **Abordagem da UI vs Cache do Baileys:** Visto que não é factível adulterar o dispositivo do cliente remotamente via Baileys WebApi, nossa plataforma deve sobrepor os contatos do Postgres sobre os contatos brutos recebidos da Bridge. Assim a plataforma sempre usará o nome atualizado, mesmo que no aparelho se mantenha o antigo.
