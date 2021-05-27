import fs from 'fs'
import _ from 'lodash'

// Return a parsed JSON Hash object.  The keys are the years, encoded
// as strings.  The value for each year is an array of strings; Each
// element in the array is a string representing the path to the files
// to use for ingest.
function loadJSONFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load json from: ${filePath}`
  }
  const raw = fs.readFileSync(filePath,  {encoding:'utf8'})
  const json = JSON.parse(raw)
  return json
}


function loadDirList (dir) {
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()){
    return _.map(fs.readdirSync(dir), (file) => {
      return `${dir}/${file}`
    })
  }
}

function isDir (path) {
  return (fs.existsSync(path) && fs.lstatSync(path).isDirectory())
}

export { 
  loadJSONFromFile,
  loadDirList,
  isDir
}