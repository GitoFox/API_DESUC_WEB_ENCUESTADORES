// encryptImagesAndModifyCSV.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function hashFile(filepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filepath);

    input.on('readable', () => {
      const data = input.read();
      if (data) hash.update(data);
      else resolve(hash.digest('hex'));
    });

    input.on('error', reject);
  });
}

async function processCSVFile() {
  const results = [];
  const csvWriter = createCsvWriter({
    path: 'out.csv',
    header: [
      { id: 'rut', title: 'rut' },
      { id: 'nombre', title: 'nombre' },
      { id: 'imagen', title: 'imagen' },
    ],
  });

  fs.createReadStream('encuestadores.csv')
    .pipe(csv())
    .on('data', async (row) => {
      if (row.imagen && row.imagen !== 'NA' && fs.existsSync(row.imagen)) {
        const hash = await hashFile(row.imagen);
        const ext = path.extname(row.imagen);
        const newImagePath = `img/${hash}${ext}`;
        fs.renameSync(row.imagen, newImagePath);
        row.imagen = newImagePath;
      }
      results.push(row);
    })
    .on('end', async () => {
      await csvWriter.writeRecords(results);
      fs.renameSync('out.csv', 'encuestadores.csv');
    });
}

processCSVFile();
