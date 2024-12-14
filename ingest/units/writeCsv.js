const fs = require('fs');
const Papa = require('papaparse');
const pify = require('pify');

async function writeCsv(path, data) {
  const csv = Papa.unparse(data);
  // console.log(`Second prep of data: ${csv}`)
  await fs.writeFile(path, csv, 'utf-8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('File written successfully.');
    }
  });
  // await pify(fs.writeFile)(path, csv, 'utf8');
}

module.exports = {
  jsonSchema: {
    properties: {
      path: {},
      data: {},
    },
  },
  command: (input) => {
    return writeCsv(input.path, input.data);
  },
}

async function spreadCsv(sourcePath, targetDir, targetBaseFileName, batchSize) {
  console.log(`Redistributing CSV records into batches of ${batchSize}`)
  console.log('Reading source CSVs...')
  const filePaths = FsHelper.loadDirPaths(sourcePath)

  let rows = []
  await pMap(filePaths, async (filePath) => {
    rows = _.concat(rows, await loadCSV(filePath))
  }, { concurrency: 1 });

  console.log('Chunking rows')
  // chunk it up into sizes of 500
  const batches = _.chunk(data, 50)
  
  console.log('Writing Author data to disk')
  const filePath = path.join(targetDir, `${targetBaseFileName}_${moment().format('YYYYMMDDHHmmss')}`)
  if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir, true);
  }
  await pMap (batches, async (batch, index) => {
    await writeCsv(`${filePath}_${index}`, batch)
  })
}