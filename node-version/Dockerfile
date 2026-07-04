FROM node:20-alpine

WORKDIR /app

# Instalar Chromium e dependências para o Puppeteer (whatsapp-web.js)
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# Informa ao Puppeteer para não baixar o Chromium próprio e usar o do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependências da aplicação
COPY package*.json ./
RUN npm install --omit=dev

# Copiar o restante da aplicação
COPY . .

# Variáveis de Ambiente
ENV NODE_ENV=production
ENV PORT=8000

# Expor porta
EXPOSE 8000

# Iniciar o servidor
CMD ["node", "server.js"]
