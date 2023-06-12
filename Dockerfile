FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Script para encriptar las imágenes en la carpeta 'img'
RUN node encryptImages.js

EXPOSE 3000

CMD [ "node", "server.js" ]
