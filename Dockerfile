# Elegir la imagen base
FROM node:14

# Crear un directorio para la aplicación en el contenedor
WORKDIR /usr/src/app

# Copiar el archivo package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias de tu aplicación
RUN npm install

# Copiar el resto de tus archivos de la aplicación
COPY . .

# Ejecutar el script de encriptación y actualización
RUN node encrypt.js

# Exponer el puerto en el que tu aplicación se ejecutará
EXPOSE 3000

# Comando para iniciar tu aplicación
CMD [ "node", "server.js" ]
