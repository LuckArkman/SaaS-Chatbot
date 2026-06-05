# Deploy no servidor (Apache)

## URL correta

Acesse sempre a **pasta `public`** na URL:

- **Com subpasta:** `http://51.161.45.53/chatbotedmilson/public/`
- Login: `http://51.161.45.53/chatbotedmilson/public/login`
- Home: `http://51.161.45.53/chatbotedmilson/public/home`

O nome da pasta no servidor deve ser exatamente o que você usa na URL (ex.: `chatbotedmilson` ou `chatbotEdmilson`).

## Se aparecer "Not Found" (404) do Apache

1. **Confirme a URL**  
   Use exatamente o caminho onde o projeto está. Ex.: se a pasta no disco for `C:\wamp64\www\chatbotEdmilson\public`, a URL deve ter `/chatbotEdmilson/public/` (respeitando maiúsculas/minúsculas se o servidor for Linux).

2. **RewriteBase no .htaccess**  
   Abra `public/.htaccess` e descomente a linha do `RewriteBase`, ajustando o caminho:
   ```apache
   RewriteBase /chatbotedmilson/public/
   ```
   O valor deve ser o mesmo caminho que aparece na URL (ex.: `/chatbotedmilson/public/`).

3. **mod_rewrite**  
   No Apache, o módulo `mod_rewrite` precisa estar ativo. No WAMP: ícone do WAMP → Apache → Apache modules → **rewrite_module** → ativar.

4. **AllowOverride**  
   No `httpd.conf`, no bloco do diretório onde está o projeto, deve ter:
   ```apache
   AllowOverride All
   ```
   (e não `AllowOverride None`).

## Deixar o site na raiz (opcional)

Para usar só `http://51.161.45.53/` (sem `/chatbotedmilson/public/`), configure o **DocumentRoot** do Apache para apontar para a pasta `public` do projeto, por exemplo:

```apache
DocumentRoot "C:/wamp64/www/chatbotEdmilson/public"
<Directory "C:/wamp64/www/chatbotEdmilson/public">
    AllowOverride All
    Require all granted
</Directory>
```

Depois, comente ou remova a linha do `RewriteBase` no `public/.htaccess`.
