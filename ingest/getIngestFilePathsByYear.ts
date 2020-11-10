const fs = require('fs');

// Return a parsed JSON Hash object.  The keys are the years, encoded
// as strings.  The value for each year is an array of strings; Each
// element in the array is a string representing the path to the files
// to use for ingest.
async function getIngestFilePathsByYear(filePath = "../config/ingestFilePaths.json") {
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }
  let raw = fs.readFileSync(filePath)
  let json = JSON.parse(raw);
  return json
}

module.exports = getIngestFilePathsByYear