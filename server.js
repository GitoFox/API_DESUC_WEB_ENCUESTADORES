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

  return nuevoPath;
}

actualizarCSV(results);


// Función para actualizar el CSV con los nombres encriptados de las imágenes
function actualizarCSV(encuestadores) {
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
}

// Ejecutar la función de encriptación al iniciar el servidor
app.get('/encuestadores/:rut', (req, res) => {
  const rut = req.params.rut.trim();

  const encuestadores = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => encuestadores.push(data))
    .on('end', () => {
      const encuestador = encuestadores.find((encuestador) => encuestador.rut.trim() === rut);

      if (encuestador) {
        let imagenPath = encuestador.imagen;
        let imagenURL;
        let sinImagen = false; // Variable para empleados sin imagen

        if (!imagenPath || imagenPath === 'NA' || imagenPath === '') {
          // Asignar la ruta de la imagen fija cuando no hay imagen disponible
          imagenPath = 'img/Saludando.png';
          sinImagen = true; // Establecer la variable sinImagen en true
        } else {
          const hashedFileName = encriptarImagen(imagenPath); // Generar el nombre encriptado de la imagen
          imagenURL = 'http://54.174.45.227:3000/img/' + hashedFileName;
          encuestador.imagen = hashedFileName; // Actualizar el campo imagen en el objeto encuestador
          actualizarCSV(encuestadores); // Actualizar el archivo CSV con los nombres encriptados de las imágenes
        }

        encuestador.imagenURL = imagenURL;
        encuestador.sinImagen = sinImagen; // Agregar la variable sinImagen al encuestador

        // Leer y procesar los proyectos del encuestador
        const proyectos = encuestadores.filter((proyecto) => proyecto.rut.trim() === rut);
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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
