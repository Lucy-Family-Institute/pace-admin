import _ from 'lodash'
import { command as loadCsv } from './loadCsv'

/**
* @param csvPath file path to a csv file containing one row per person to load
*
* @param propertyMap a Hash map to use to map column names to NormedPerson properties, 
* expects keys to be valid NormedPerson property name, value possible column name in csv file.
* Also expects mapped property names and values to all be lowercase
*
* @returns After async execution, returns an array of NormedPerson objects
*/
export async function loadPersons (csvPath: string, propertyMap: {}={}): Promise<NormedPerson[]> {
  console.log(`Loading Persons from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const rows: any = await loadCsv({
     path: csvPath,
     lowerCaseColumns: true
    })

    //normalize column names to all lowercase
    return _.map(rows, (row) => {
      const id = getMappedPropertyValue(row, 'id', propertyMap)
      const givenName = getMappedPropertyValue(row, 'givenName', propertyMap)
      const givenNameInitial = getMappedPropertyValue(row, 'givenNameInitial', propertyMap)
      const scopusAffiliationId = getMappedPropertyValue(row, 'scopusAffiliationId', propertyMap)
      const person: NormedPerson = {
        id: id ? Number.parseInt(id) : undefined,
        familyName: getMappedPropertyValue(row, 'familyName', propertyMap),
        givenNameInitial: givenNameInitial ? givenNameInitial : (givenName) ? givenName.charAt(0) : undefined,
        givenName: givenName,
        startDate: new Date(getMappedPropertyValue(row, 'startDate', propertyMap)),
        endDate: new Date(getMappedPropertyValue(row, 'endDate', propertyMap)),
        sourceIds: {
          scopusAffiliationId: getMappedPropertyValue(row, 'scopusAffiliationId', propertyMap)
        }    
      }
      return person
    })
  } catch (error){
    console.log(`Error on person load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}

function getMappedPropertyValue(row, propertyName, propertyMap={}) {
  // these steps assume that column names in row have already been converted to lowercase
  const lowerPropName = propertyName.toLowerCase()
  if (row[lowerPropName]) {
    return row[lowerPropName]
  } 
  
  if (propertyMap[lowerPropName]) {
    const lowerMappedProp = propertyMap[lowerPropName].toLowerCase()
    if (row[lowerMappedProp]) {
      return row[lowerMappedProp]
    }
  }

  // finally check non-lowercase version in property map in case that sneaks through
  if (propertyMap[propertyName]) {
    const lowerMappedProp = propertyMap[propertyName].toLowerCase()
    if (row[lowerMappedProp]) {
      return row[lowerMappedProp]
    }
  }

  return undefined
}