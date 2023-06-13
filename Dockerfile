# Usar una imagen de Node.js LTS (Long Term Support)
FROM node:lts

# Crear directorio de la aplicación en el contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

RUN ls -la /usr/src/app/img/

# Ejecuta el script que encripta las imágenes y modifica el archivo CSV
RUN node encryptImagesAndModifyCSV.js

# Exponer el puerto 3000
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "node", "server.js" ]
