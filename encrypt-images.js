const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const imageDir = './img/';

fs.readdir(imageDir, (err, files) => {
  if (err) {
    console.error('Error reading image directory:', err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(imageDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const fileData = fs.readFileSync(filePath);

      const hash = crypto.createHash('sha256');
      hash.update(fileData);

      const hashedFileName = hash.digest('hex') + path.extname(file);

      const newFilePath = path.join(imageDir, hashedFileName);

      fs.renameSync(filePath, newFilePath);
    }
  });

  console.log('Images encrypted successfully!');
});