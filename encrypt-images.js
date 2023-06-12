const fs = require('fs');
const crypto = require('crypto');

const imageDir = './img/';

fs.readdir(imageDir, (err, files) => {
  if (err) {
    console.error('Error reading image directory:', err);
    return;
  }

  files.forEach((file) => {
    const filePath = imageDir + file;
    const fileData = fs.readFileSync(filePath);

    const hash = crypto.createHash('sha256');
    hash.update(fileData);

    const hashedFileName = hash.digest('hex') + '.jpg';

    const newFilePath = imageDir + hashedFileName;

    fs.renameSync(filePath, newFilePath);
  });

  console.log('Images encrypted successfully!');
});
