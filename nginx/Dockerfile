FROM nginx:stable-alpine

RUN apk add --no-cache openssl

# Gera certificado SSL auto-assinado para desenvolvimento/staging.
# Em produção, substituir pelos arquivos reais via volume ou COPY.
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
    -keyout /etc/nginx/ssl/server.key \
    -out    /etc/nginx/ssl/server.crt \
    -subj   "/C=BR/ST=SP/L=SaoPaulo/O=SaaS-Chatbot/OU=IT/CN=localhost" && \
    chmod 600 /etc/nginx/ssl/server.key

# Configuração principal do Nginx (ajustes globais de performance)
COPY nginx.conf     /etc/nginx/nginx.conf

# Configuração do virtual host (rotas e proxy)
COPY default.conf   /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
