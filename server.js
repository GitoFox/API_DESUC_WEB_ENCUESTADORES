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

// Ruta para encriptar las imágenes de la carpeta 'img'
const imgFolderPath = path.join(__dirname, 'img');

// Función para encriptar las imágenes y actualizar el archivo CSV
function encriptarImagenes() {
  fs.readdir(imgFolderPath, (err, files) => {
    if (err) {
      console.error('Error al leer la carpeta de imágenes:', err);
      return;
    }

    files.forEach((file) => {
      const imagePath = path.join(imgFolderPath, file);
      const imageBuffer = fs.readFileSync(imagePath);
      const hash = crypto.createHash('sha256');
      hash.update(imageBuffer);
      const hashedFileName = hash.digest('hex') + path.extname(file);
      const hashedFilePath = path.join(imgFolderPath, hashedFileName);

      fs.renameSync(imagePath, hashedFilePath);

      // Actualizar el CSV con el nuevo path encriptado
      const csvPath = 'encuestadores.csv';

      fs.readFile(csvPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error al leer el archivo CSV:', err);
          return;
        }
      
        const lines = data.split('\n');
        let updatedData = '';
      
        lines.forEach((line) => {
          const columns = line.split(',');
      
          if (columns.length >= 7) {
            const originalFileName = path.basename(columns[6].trim());
            const hashedFileName = path.basename(hashedFilePath);
            
            if (originalFileName === hashedFileName) {
              columns[6] = hashedFilePath; // Actualizar el path encriptado
            }
          }
      
          updatedData += columns.join(',') + '\n';
        });
      
        fs.writeFile(csvPath, updatedData, 'utf8', (err) => {
          if (err) {
            console.error('Error al actualizar el archivo CSV:', err);
            return;
          }
      
          console.log(`Archivo CSV actualizado con el path encriptado: ${hashedFilePath}`);
        });
      });
    });

    console.log('Imágenes encriptadas correctamente');
  });
}

// Ejecutar la función de encriptación al iniciar el servidor
encriptarImagenes();

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
        let imagenPath = encuestador.img;
        let imagenURL;
        let sinImagen = false; // Variable para empleados sin imagen

        if (!imagenPath || imagenPath === 'NA' || imagenPath === '') {
          // Asignar la ruta de la imagen fija cuando no hay imagen disponible
          imagenPath = 'img/Saludando.png';
          sinImagen = true; // Establecer la variable sinImagen en true
        } else {
          const hashedFileName = path.basename(imagenPath); // Obtén el nombre del archivo encriptado
          imagenURL = 'http://54.174.45.227:3000/img/' + hashedFileName;
        }

        encuestador.imagenURL = imagenURL;
        encuestador.sinImagen = sinImagen; // Agregar la variable sinImagen al encuestador
        encuestador.imagenEncriptadaURL = imagenURL; // Nueva propiedad para la imagen encriptada


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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
