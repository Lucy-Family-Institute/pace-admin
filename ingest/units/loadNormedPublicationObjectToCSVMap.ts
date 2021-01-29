import fs from 'fs'

/**
 * Return a parsed JSON Hash object.  The input expects the tree of NormedPublication to have corresponding key/value pairs 
* for each corresponding property and nested properties defined at the leaf level.
* For example:   "searchPerson": {
                      "id": "search_person_id",
                      "familyName": "search_person_family_name",
                      ...
                 },
                 "title": "title"
}   
}
*/
export function loadNormedPublicationObjectToCSVMap(filePath = "../config/normedPublicationObjectToCSVMap.json", filesystem = fs) {
  if (!filesystem.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }
  let raw = filesystem.readFileSync(filePath, 'utf8')
  let json = JSON.parse(raw);
  return json
}