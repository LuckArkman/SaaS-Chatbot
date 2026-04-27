FROM node:20-alpine

WORKDIR /app

# Instalar dependências
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
