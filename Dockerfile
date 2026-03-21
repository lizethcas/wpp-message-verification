FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# IMPORTANTE: En Render el puerto debe ser 10000
ENV PORT=10000
EXPOSE 10000

CMD ["node", "index.js"]
