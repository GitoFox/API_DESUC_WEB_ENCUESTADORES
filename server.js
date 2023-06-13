const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const moment = require('moment');
const crypto = require('crypto');
const fastcsv = require('fast-csv');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

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

        imagenURL = 'http://54.165.24.96:3000/img/' + path.basename(imagenPath); // Obtén solo el nombre del archivo de la imagen
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

app.use('/img', express.static(path.join(__dirname, 'img')));

// Generar hash para las imágenes y actualizar CSV
async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

const csvData = [];
const csvStream = fastcsv.parseFile('encuestadores.csv', {headers: true})
  .on('data', row => {
    csvData.push(row);
  })
  .on('end', async rowCount => {
    console.log(`Parsed ${rowCount} rows`);

    for(let row of csvData) {
      // Actualizar el path de la imagen a formato UNIX si está en formato Windows
      const formattedImagePath = row.imagen.split('\\').join('/');
      
      const oldPath = path.join(__dirname, formattedImagePath);
      const hash = await hashFile(oldPath);
      const ext = path.extname(oldPath);
      const newPath = path.join(path.dirname(oldPath), `${hash}${ext}`);
      fs.renameSync(oldPath, newPath);
      row.imagen = newPath.replace(__dirname + '/', ''); // Actualizar la dirección en el CSV
    }

    // Escribir en un nuevo CSV
    const csvWriter = createCsvWriter({
      path: 'encuestadores_new.csv',
      header: Object.keys(csvData[0]).map(key => ({id: key, title: key})),
    });
  
    csvWriter.writeRecords(csvData).then(() => console.log('CSV file written'));

    // Iniciar el servidor después de que se haya actualizado el CSV
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  });
