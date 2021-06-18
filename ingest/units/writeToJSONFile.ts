import fs from 'fs'
import _ from 'lodash'
import pify from 'pify'

// Return a parsed JSON Hash object.  The keys are the years, encoded
// as strings.  The value for each year is an array of strings; Each
// element in the array is a string representing the path to the files
// to use for ingest.
export default async function writeToJSONFile(object, filePath) {
  try {
    await pify(fs.writeFile)(filePath, JSON.stringify(object))
  } catch (error) {
    const errorMessage = `Error on write JSON file: ${filePath}`
    console.log(errorMessage)
    throw error
  }
}