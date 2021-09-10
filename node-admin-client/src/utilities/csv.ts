const fs = require('fs');
const Papa = require('papaparse');
const pify = require('pify');

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(
      file,
      {
        header: true,
        complete: (results) => {
          if (results.error) {
            reject(results.error);
          }
          resolve(results.data);
        },
      },
    );
  });
}

export async function writeCsv(path, data) {
  const csv = Papa.unparse(data)
  await pify(fs.writeFile)(path, csv)
}

export async function readCsv(path) {
  return await parseCsv(fs.createReadStream(path))
}
