const crypto = require('crypto');
const fs = require('fs');
const csv = require('csv-parser');
const csvWriter = require('csv-writer').createObjectCsvWriter;

function encryptImage(fileName) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(`img/${fileName}`);
        const hash = crypto.createHash('sha256');
        input.pipe(hash);

        hash.on('data', (hashBuffer) => {
            const hashedFileName = hashBuffer.toString('hex');
            input.close();
            fs.rename(`img/${fileName}`, `img/encrypted/${hashedFileName}`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hashedFileName);
                }
            });
        });
    });
}

if (!fs.existsSync('img/encrypted')) {
    fs.mkdirSync('img/encrypted');
}

const path = require('path');

async function encryptAllImages() {
    const dir = 'img';
    const files = fs.readdirSync(dir);
    const encryptedFiles = {};

    for (let file of files) {
        // Full path of the file
        const filePath = path.join(dir, file);

        // Check if the file is not a directory
        if (fs.statSync(filePath).isFile() && file !== '.DS_Store') {
            const hashedFileName = await encryptImage(file);
            encryptedFiles[file] = hashedFileName;
        }
    }

    return encryptedFiles;
}

async function updateCsvFile() {
    const encryptedFiles = await encryptAllImages();
    const results = [];
    
    fs.createReadStream('encuestadores.csv')
        .pipe(csv())
        .on('data', (data) => {
            if (data.imagen in encryptedFiles) {
                data.imagen = `img/encrypted/${encryptedFiles[data.imagen]}`;
            }
            results.push(data);
        })
        .on('end', () => {
            const writer = csvWriter({
                path: 'encuestadores.csv',
                header: Object.keys(results[0]).map((key) => ({id: key, title: key})),
            });
            
            writer.writeRecords(results);
        });
}

updateCsvFile().then(() => {
  console.log("Imagenes encriptadas y CSV actualizado.");
}).catch((error) => {
  console.error("Error encriptando imagenes y actualizando CSV: ", error);
});
