const fs = require('fs');
const Papa = require('papaparse');

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

async function loadCsv(filePath) {
  // TODO error on missing filepath
  const data = await parseCsv(fs.createReadStream(filePath));
  return data;
}

module.exports = {
  jsonSchema: {
    properties: {
      path: {},
    },
  },
  command: (input) => {
    return loadCsv(input.path);
  },
}