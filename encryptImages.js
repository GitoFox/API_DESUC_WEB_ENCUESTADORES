const fs = require('fs');
const crypto = require('crypto');

const imagesFolder = '/app/img/';

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
  });

  console.log('Proceso de encriptación finalizado.');
});
