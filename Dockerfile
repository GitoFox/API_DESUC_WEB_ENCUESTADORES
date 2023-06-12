FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN node encryptImages.js # Agrega esta línea para ejecutar el script

EXPOSE 3000

CMD [ "node", "server.js" ]
