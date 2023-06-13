const express = require('express');
const csv = require('csvtojson');
const json2csv = require('json2csv').parse;
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

const processLine = (line) => {
  let imagenPath = line.imagen;
  let imagenURL;

  if (!imagenPath || imagenPath === 'NA' || imagenPath === '') {
    imagenPath = 'img/Saludando.png';
  } else {
    const hash = crypto.createHash('sha256');
    const imageName = hash.update(imagenPath).digest('hex');
    const imageExtension = path.extname(imagenPath);
    const encryptedImagePath = `images/${imageName}${imageExtension}`;
    fs.copyFileSync(imagenPath, encryptedImagePath);
    line.imagen = encryptedImagePath;
  }

  imagenURL = 'http://54.165.24.96:3000/img/' + path.basename(line.imagen);
  line.imagenURL = imagenURL;

  return line;
};

app.get('/encuestadores/:rut', (req, res) => {
  const rut = req.params.rut.trim();

  const results = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const encuestador = results.find((encuestador) => encuestador.rut.trim() === rut);

      if (encuestador) {
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

        res.json(encuestador);
      } else {
        res.status(404).json({ error: 'Encuestador no encontrado' });
      }
    });
});

app.use('/img', express.static(path.join(__dirname, 'images')));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  csv()
    .fromFile('encuestadores.csv')
    .then((results) => {
      const updatedResults = results.map(processLine);
      const updatedCsv = json2csv(updatedResults);
      fs.writeFileSync('encuestadores.csv', updatedCsv, 'utf8');
    });
});
