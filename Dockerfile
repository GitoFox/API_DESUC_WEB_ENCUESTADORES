# Establecer la imagen base
FROM node:14

# Crear el directorio de la aplicación en el contenedor
WORKDIR /usr/src/app

# Copiar el archivo de las dependencias del proyecto
COPY package*.json ./

# Instalar las dependencias del proyecto
RUN npm install

# Copiar el resto del código de la aplicación al contenedor
COPY . .

# Exponer el puerto que la aplicación utilizará
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "node", "server.js" ]
