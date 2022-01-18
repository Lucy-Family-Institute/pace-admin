import fs from 'fs'
import path from 'path'
import _ from 'lodash'

export default class FsHelper {
  // Return a parsed JSON Hash object.  The keys are the years, encoded
  // as strings.  The value for each year is an array of strings; Each
  // element in the array is a string representing the path to the files
  // to use for ingest.
  public static loadJSONFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw `Invalid path on load json from: ${filePath}`
    }
    const raw = fs.readFileSync(filePath,  {encoding:'utf8'})
    const json = JSON.parse(raw)
    return json
  }


  public static loadDirList (dir, ignoreDirectories = false) {
    if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()){
      const dirList = _.map(fs.readdirSync(dir), (file) => {
        return `${dir}/${file}`
      })
      if (ignoreDirectories) {
        return _.filter(dirList, (dir) => {
          return !FsHelper.isDir(dir)
        })
      } else {
        return dirList
      }
    } else {
      throw(`FS Helper: On load dir list, target path not found: ${dir}`)
    } 
  }

  public static isDir (path) {
    return (fs.existsSync(path) && fs.lstatSync(path).isDirectory())
  }

  public static loadDirPaths (dir, ignoreDirectories = true) {
    let loadPaths = []
    if (FsHelper.isDir(dir)) {
      loadPaths = FsHelper.loadDirList(dir, ignoreDirectories)
    } else {
      loadPaths.push(dir)
    }
    return loadPaths
  }

  public static getFileName(filePath) {
    // skip any subdirectories
    if (!FsHelper.isDir(filePath)){
      return path.basename(filePath)
    } else {
      throw('Path points to a directory instead of a file')
    }
  }

  // assumes a path to a file is passee in
  public static getParentDir(filePath){
    return path.dirname(filePath)
  }
}