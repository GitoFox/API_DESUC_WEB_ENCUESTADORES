# Utiliza una imagen base con Node.js instalado
FROM node:14

# Establece el directorio de trabajo en la aplicación
WORKDIR /app

# Copia los archivos de la aplicación al contenedor
COPY package.json package-lock.json /app/
RUN npm install

COPY . /app

# Expone el puerto 3000 en el contenedor
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
