const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const moment = require('moment');
const crypto = require('crypto');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Función para encriptar una imagen
function encryptImage(fileName) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(`img/${fileName}`);
    const hash = crypto.createHash('sha256');
    input.pipe(hash);

    hash.on('data', (hashBuffer) => {
      const hashedFileName = hashBuffer.toString('hex');
      input.close();

      // Renombrar y mover la imagen encriptada
      fs.rename(`img/${fileName}`, `img/encrypted/${hashedFileName}`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(hashedFileName);
        }
      });
    });
  });
}

// Función para encriptar todas las imágenes
async function encryptAllImages() {
  const files = fs.readdirSync('img');
  const encryptedFiles = {};

  for (let file of files) {
    if (file !== '.DS_Store') {
      const hashedFileName = await encryptImage(file);
      encryptedFiles[file] = hashedFileName;
    }
  }

  return encryptedFiles;
}

// Función para actualizar el CSV
async function updateCsvFile() {
  const encryptedFiles = await encryptAllImages();
  const results = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => {
      if (data.imagen in encryptedFiles) {
        data.imagen = `img/encrypted/${encryptedFiles[data.imagen]}`;
      }
      results.push(data);
    })
    .on('end', () => {
      const writer = csvWriter({
        path: 'encuestadores.csv',
        header: Object.keys(results[0]).map((key) => ({ id: key, title: key })),
      });

      writer.writeRecords(results);
    });
}

// Ruta para buscar a un encuestador por su RUT
app.get('/encuestadores/:rut', (req, res) => {
  const rut = req.params.rut.trim();

  const results = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const encuestador = results.find((encuestador) => encuestador.rut.trim() === rut);

      if (encuestador) {
        let imagenPath = encuestador.imagen;
        let imagenURL;

        if (!imagenPath || imagenPath === 'NA' || imagenPath === '') {
          // Asignar la ruta de la imagen fija cuando no hay imagen disponible
          imagenPath = 'img/Saludando.png';
        }

        imagenURL = 'http://localhost:3000/img/' + path.basename(imagenPath); // Obtén solo el nombre del archivo de la imagen
        encuestador.imagenURL = imagenURL;

        // Leer y procesar los proyectos del encuestador
        const proyectos = results.filter((proyecto) => proyecto.rut.trim() === rut);
        const currentDate = moment();

        const proyectosActivos = [];
        const proyectosExpirados = [];

        proyectos.forEach((proyecto) => {
          const fechaFin = moment(proyecto.proyecto_fecha_fin, 'M/D/YYYY');
          const estaActivo = currentDate.isSameOrBefore(fechaFin, 'day');

          const proyectoClasificado = {
            nombre: proyecto.proyecto_nom,
            fechaInicio: proyecto.proyecto_fecha_ini,
            fechaFin: proyecto.proyecto_fecha_fin,
          };

          if (estaActivo) {
            proyectosActivos.push(proyectoClasificado);
          } else {
            proyectosExpirados.push(proyectoClasificado);
          }
        });

        encuestador.proyectosActivos = proyectosActivos;
        encuestador.proyectosExpirados = proyectosExpirados;

        // Devolver solo los datos del encuestador y sus proyectos asociados
        res.json(encuestador);
      } else {
        res.status(404).json({ error: 'Encuestador no encontrado' });
      }
    });
});

// Ruta para servir las imágenes de los encuestadores
app.use('/img', express.static(path.join(__dirname, 'img')));

// Middleware para encriptar las imágenes y actualizar el CSV al iniciar el servidor
app.use(async (req, res, next) => {
  if (!fs.existsSync('img/encrypted')) {
    fs.mkdirSync('img/encrypted');
  }

  await encryptAllImages();
  updateCsvFile();

  next();
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
