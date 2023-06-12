const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const csv = require('csv-parser');

const imageDir = './img/';
const csvFilePath = 'encuestadores.csv';

// Leer el archivo CSV y encriptar las imágenes
fs.readFile(csvFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading CSV file:', err);
    return;
  }

  const lines = data.split('\n');
  let updatedData = '';

  lines.forEach((line) => {
    const columns = line.split(',');

    if (columns.length >= 7) {
      const imagePath = columns[6].trim();
      const imageFileName = path.basename(imagePath);
      const imageFilePath = path.join(imageDir, imageFileName);

      if (fs.existsSync(imageFilePath)) {
        const fileData = fs.readFileSync(imageFilePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileData);
        const hashedFileName = hash.digest('hex') + path.extname(imageFileName);
        const hashedFilePath = path.join(imageDir, hashedFileName);

        fs.renameSync(imageFilePath, hashedFilePath);

        columns[6] = hashedFilePath; // Actualizar el path encriptado en el CSV
      }
    }

    updatedData += columns.join(',') + '\n';
  });

  fs.writeFile(csvFilePath, updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error updating CSV file:', err);
      return;
    }

    console.log('CSV file updated successfully!');
  });
});
