FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código fonte
COPY src/ ./src/

# Expor porta
EXPOSE 3002

# Comando padrão
CMD ["npm", "start"]
