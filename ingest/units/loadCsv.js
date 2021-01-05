const fs = require('fs');
const Papa = require('papaparse');
const _ = require('lodash');

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

async function loadCsv(filePath, lowerCaseColumns=false) {
  // TODO error on missing filepath
  console.log(`Loading CSV File from path: ${filePath}`)
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }
  const data = await parseCsv(fs.createReadStream(filePath));
  if (lowerCaseColumns) {
    return normalizeColumnsToLowercase(data);
  } else {
    return data;
  }
}

/**
 * 
 * @param csvData An object expected to be rows loaded from a csv file
 * 
 * @returns The object with all columns converted to lowercase
 */
function normalizeColumnsToLowercase (rows) {
  //normalize column names to all lowercase
  return _.mapValues(rows, function (row) {
    return _.mapKeys(row, function (value, key) {
      return key.toLowerCase()
    })
  })
}

module.exports = {
  jsonSchema: {
    properties: {
      path: {},
      lowerCaseColumns: false
    },
  },
  command: (input) => {
    return loadCsv(input.path, input.lowerCaseColumns);
  },
}