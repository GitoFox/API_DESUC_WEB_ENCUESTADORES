const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const csv = require('csv-parser');

const imagesFolder = '/app/img/';
const csvFilePath = 'encuestadores.csv';

const encryptedImages = [];

fs.readdir(imagesFolder, (err, files) => {
  if (err) {
    console.error('Error al leer la carpeta de imágenes:', err);
    return;
  }

  files.forEach((file) => {
    const imagePath = `${imagesFolder}${file}`;
    const imageBuffer = fs.readFileSync(imagePath);
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const encryptedImagePath = `${imagesFolder}${hash}.png`;

    fs.renameSync(imagePath, encryptedImagePath);
    console.log(`Imagen encriptada: ${encryptedImagePath}`);

    encryptedImages.push({ originalPath: imagePath, encryptedPath: encryptedImagePath });
  });

  console.log('Proceso de encriptación finalizado.');

  // Actualizar el archivo CSV con las nuevas direcciones de las imágenes encriptadas
  updateCSV(csvFilePath, encryptedImages);
});

function updateCSV(csvFilePath, encryptedImages) {
  const rows = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      const encryptedImage = encryptedImages.find((img) => img.originalPath === row.imagen);

      if (encryptedImage) {
        row.imagen = encryptedImage.encryptedPath;
      }

      rows.push(row);
    })
    .on('end', () => {
      const updatedCSV = rows.map((row) => Object.values(row).join(',')).join('\n');

      fs.writeFileSync(csvFilePath, updatedCSV);
      console.log('Archivo CSV actualizado correctamente.');
    });
}
