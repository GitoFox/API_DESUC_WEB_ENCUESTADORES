const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const moment = require('moment');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware para parsear el cuerpo de las solicitudes como JSON
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Función para encriptar una imagen
function encriptarImagen(imagenPath) {
  const extension = path.extname(imagenPath);
  const nombreArchivo = path.basename(imagenPath, extension);

  const hash = crypto.createHash('sha256');
  hash.update(nombreArchivo);
  const nombreEncriptado = hash.digest('hex');

  const nuevoNombre = nombreEncriptado + extension;

  const nuevoPath = path.join('img', nuevoNombre);
  fs.renameSync(imagenPath, nuevoPath);

  actualizarCSV();

  return nuevoPath;
}

// Función para actualizar el CSV con los nombres encriptados de las imágenes
function actualizarCSV() {
  const encuestadores = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => encuestadores.push(data))
    .on('end', () => {
      const writeStream = fs.createWriteStream('encuestadores.csv');
      writeStream.write('rut,Nombre,Apellidos,proyecto_nom,proyecto_fecha_ini,proyecto_fecha_fin,imagen\n');

      encuestadores.forEach((encuestador) => {
        const {
          rut,
          Nombre,
          Apellidos,
          proyecto_nom,
          proyecto_fecha_ini,
          proyecto_fecha_fin,
          imagen
        } = encuestador;

        const csvRow = `${rut},${Nombre},${Apellidos},${proyecto_nom},${proyecto_fecha_ini},${proyecto_fecha_fin},${imagen}`;
        writeStream.write(csvRow + '\n');
      });

      writeStream.end();
    });
}

// Ruta para encriptar una imagen y actualizar el CSV
app.get('/encriptar-imagen/:imagenPath', (req, res) => {
  const imagenPath = req.params.imagenPath.trim();
  const hashedFileName = encriptarImagen(imagenPath);
  res.json({ hashedFileName });
});

// Ruta para servir las imágenes de los encuestadores
app.use('/img', express.static(path.join(__dirname, 'img')));

// Ejecutar la función de encriptación al iniciar el servidor
fs.createReadStream('encuestadores.csv')
  .pipe(csv())
  .on('data', (data) => {
    const imagenPath = data.imagen;
    if (imagenPath && imagenPath !== 'NA' && imagenPath !== '') {
      encriptarImagen(imagenPath);
    }
  })
  .on('end', () => {
    // Iniciar el servidor después de encriptar todas las imágenes
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  });
