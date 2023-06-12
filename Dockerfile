FROM node:14

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

COPY . /app

# Agregar todas las imágenes de la carpeta img al contenedor
COPY ./img /app/img

EXPOSE 3000
# Comando para iniciar la aplicación
CMD ["node", "server.js"]
