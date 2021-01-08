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
     columnNameMap: propertyMap,
     lowerCaseColumns: true
    })

    //normalize column names to all lowercase
    return _.map(rows, (row) => {
      const id = row['id']
      const givenName = row['givenname']
      const givenNameInitial = row['givennameinitial']
      const scopusAffiliationId = row['scopusaffiliationid']
      const person: NormedPerson = {
        id: id ? Number.parseInt(id) : undefined,
        familyName: row['familyname'],
        givenNameInitial: givenNameInitial ? givenNameInitial : (givenName) ? givenName.charAt(0) : undefined,
        givenName: givenName,
        startDate: new Date(row['startdate']),
        endDate: new Date(row['enddate']),
        sourceIds: {
          scopusAffiliationId: row['scopusaffiliationId']
        }    
      }
      return person
    })
  } catch (error){
    console.log(`Error on person load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}