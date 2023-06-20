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

// Cargando y encriptando las imágenes al inicio
let results = [];
fs.createReadStream('encuestadores.csv')
  .pipe(csv())
  .on('data', (data) => {
    let imagenPath = data.imagen;
    if (imagenPath && imagenPath !== 'NA' && imagenPath.trim() !== '') {
      const hash = crypto.createHash('sha256');
      const imageName = hash.update(imagenPath).digest('hex');
      const imageExtension = path.extname(imagenPath);
      const encryptedImagePath = `images/${imageName}${imageExtension}`;

      fs.copyFileSync(imagenPath, encryptedImagePath);
      data.imagen = encryptedImagePath;
    }

    results.push(data);
  })
  .on('end', () => {
    console.log('Imágenes cargadas y encriptadas.');
  });

// Ruta para buscar a un encuestador por su RUT
app.get('/encuestadores/:rut', (req, res) => {
  const rut = req.params.rut.trim();
  const encuestador = results.find((encuestador) => encuestador.rut && encuestador.rut.trim() === rut);

  if (encuestador) {
    let imagenURL = 'http://3.209.219.82:3000/img/' + path.basename(encuestador.imagen);
    encuestador.imagenURL = imagenURL;

    const proyectos = results.filter((proyecto) => proyecto.rut && proyecto.rut.trim() === rut);
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

    res.json(encuestador);
  } else {
    res.status(404).json({ error: 'Encuestador no encontrado' });
  }
});

// Ruta para servir las imágenes de los encuestadores
app.use('/img', express.static(path.join(__dirname, 'images')));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
