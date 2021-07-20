import _ from 'lodash'
import { getDateObject } from '../units/dateRange'
import { command as loadCsv } from '../units/loadCsv'

export default class NormedPerson {
  // ------ begin declare properties used when using NormedPerson like an interface
  id: Number
  familyName: string
  givenNameInitial: string
  givenName: string
  startDate: Date
  endDate: Date
  nameVariances?: []
  sourceIds: {
    scopusAffiliationId?: string,
    semanticScholarIds?: string[]
  }
  // ------ end declare properties used when using NormedPerson like an interface

  /**
   * @param csvPath the path to a CSV that contains the flat
   * non-normalized person records
   *
   * @returns an array of normalized people (e.g. NormedPerson)
   */
  public static async loadFromCSV (csvPath: string): Promise<NormedPerson[]> {
    console.log(`Loading People from path: ${csvPath}`)
    try {
      const peopleFromCsv: any = await loadCsv({
        path: csvPath,
        lowerCaseColumns: true
      })

      return _.map(peopleFromCsv, (personRow) => {
        return NormedPerson.getNormedPersonObjectFromCSVRow(personRow)
      })
    } catch (error) {
      console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
      throw error
    }
  }

  /**
   * This function normalizes the given `personRow` into a NormedPerson
   *
   * @param personRow a single row, in a key/value pair form
   *
   * @return NormedPerson
   **/
  public static getNormedPersonObjectFromCSVRow(personRow): NormedPerson {
    const givenName = personRow['given_name']
    let person: NormedPerson = {
      id: personRow['id'] ? Number.parseInt(personRow['id']) : undefined,
      familyName: personRow['family_name'],
      givenNameInitial: personRow['given_name_initial'] ? personRow['given_name_initial'] : (givenName) ? givenName.charAt(0) : undefined,
      givenName: givenName,
      startDate: getDateObject(personRow['start_date']),
      endDate: getDateObject(personRow['end_date']),
      sourceIds: {
        scopusAffiliationId: personRow['scopus_affiliation_id']
      }
    }
    return person
  }
}