# Usamos una imagen de Node que ya incluye herramientas de sistema
FROM ghcr.io/puppeteer/puppeteer:latest

# Cambiamos al usuario root para instalar dependencias si fuera necesario
USER root

# Directorio de trabajo
WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias (incluyendo whatsapp-web.js)
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto que usa Express
EXPOSE 3001

# Comando para arrancar la app
CMD ["node", "index.js"]
