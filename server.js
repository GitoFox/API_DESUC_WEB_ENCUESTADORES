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

// Función para encriptar una imagen y generar el nuevo path encriptado
const encriptarImagen = (imagenPath) => {
  if (!imagenPath || imagenPath === 'NA' || imagenPath === '') {
    // Asignar la ruta de la imagen fija cuando no hay imagen disponible
    return 'img/Saludando.png';
  }

  // Generar un hash único para el nombre de la imagen
  const hash = crypto.createHash('sha256');
  const imageName = hash.update(imagenPath).digest('hex');
  const imageExtension = path.extname(imagenPath);
  const encryptedImagePath = `images/${imageName}${imageExtension}`;

  // Copiar la imagen original a la carpeta "images" con el nuevo nombre encriptado
  fs.copyFileSync(imagenPath, encryptedImagePath);

  return encryptedImagePath;
};

// Ruta para buscar a un encuestador por su RUT
app.get('/encuestadores/:rut', (req, res) => {
  const rut = req.params.rut.trim();

  const results = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const encuestador = results.find((encuestador) => encuestador.RUT.trim() === rut);

      if (encuestador) {
        // Encriptar todas las imágenes correspondientes al encuestador
        const proyectos = results.filter((proyecto) => proyecto.RUT.trim() === rut);
        proyectos.forEach((proyecto) => {
          const imagenPath = proyecto.imagen;
          proyecto.imagen = encriptarImagen(imagenPath);
        });

        // Obtener la URL de la primera imagen encriptada
        const imagenURL = 'http://54.165.24.96:3000/img/' + path.basename(proyectos[0].imagen);
        encuestador.imagenURL = imagenURL;

        // Leer y procesar los proyectos del encuestador
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
app.use('/img', express.static(path.join(__dirname, 'images')));

// Función para encriptar todas las imágenes y actualizar los paths en el archivo CSV
// Función para encriptar todas las imágenes y actualizar los paths en el archivo CSV
const encriptarTodasLasImagenes = () => {
  const results = [];

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const ruts = results.map((encuestador) => encuestador.RUT.trim());
      const uniqueRuts = [...new Set(ruts)];

      uniqueRuts.forEach((rut) => {
        const proyectos = results.filter((proyecto) => proyecto.RUT.trim() === rut);

        proyectos.forEach((proyecto) => {
          const imagenPath = proyecto.imagen;
          const encryptedImagePath = encriptarImagen(imagenPath);
          proyecto.imagen = encryptedImagePath;
        });
      });

      // Guardar los cambios en el archivo CSV
      const writer = fs.createWriteStream('encuestadores.csv');
      writer.write('RUT,Nombre,Apellidos,imagen\n');
      results.forEach((encuestador) => {
        const proyectos = results.filter((proyecto) => proyecto.RUT.trim() === encuestador.RUT.trim());
        proyectos.forEach((proyecto) => {
          writer.write(`${encuestador.RUT},${encuestador.Nombre},${encuestador.Apellidos},${proyecto.imagen}\n`);
        });
      });
      writer.end();
    });
};


// Encriptar todas las imágenes al iniciar el servidor
encriptarTodasLasImagenes();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
