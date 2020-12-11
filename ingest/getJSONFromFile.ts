import fs from 'fs'

// Return a parsed JSON Hash object.  The keys are the years, encoded
// as strings.  The value for each year is an array of strings; Each
// element in the array is a string representing the path to the files
// to use for ingest.
async function getJSONFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load json from: ${filePath}`
  }
  const raw = fs.readFileSync(filePath,  {encoding:'utf8'})
  const json = JSON.parse(raw)
  return json
}

export { 
  getJSONFromFile
}