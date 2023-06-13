# Seleccionar la imagen base
FROM node:14

# Crear el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar los archivos de la aplicación al contenedor
COPY package*.json ./
COPY server.js ./
COPY encuestadores.csv ./
COPY img/ ./img/

# Instalar las dependencias
RUN npm install

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "node", "server.js" ]
