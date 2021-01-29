import _ from 'lodash'
import { command as loadCsv } from './loadCsv'
import { loadNormedPublicationObjectToCSVMap } from './loadNormedPublicationObjectToCSVMap'

const defaultPublicationColumnMap = loadNormedPublicationObjectToCSVMap()
/**
 * 
 * @param csvPath the path the csv file containing the publications to be loaded
 * 
 * @param columnNameMap a map of column names in the csv to harvestset property names, if not defined uses default path from configuration
 * 
 * @returns object with array of raw publication set as well as hash of doi to index of corresponding publication in array
 */
export async function loadPublications (csvPath: string, columnNameMap=defaultPublicationColumnMap): Promise<NormedPublication[]> {
  console.log(`Loading Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const authorPapers: any = await loadCsv({
      path: csvPath,
      lowerCaseColumns: true
    })

    let sourceName = undefined
    if (authorPapers.length > 0){
      sourceName = authorPapers[0]['sourcename']
    }

    const objectToCSVMap = loadNormedPublicationObjectToCSVMap()
    return _.map(authorPapers, (paper) => {
      return getNormedPublicationObjectFromCSVRow(paper, objectToCSVMap)
    })
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}

/**
 * Expects the map to be used in defining column_names to pull properties for each leaf of NormedPublication object 
 * (e.g., for the searchPerson property there is an object that defines a column name for each item that equates to a string)
 * @param row 
 */
export function getNormedPublicationObjectFromCSVRow(row, objectToCSVMap): NormedPublication {
  // assumes all column names in row passed in have been converted to lowercase
  const searchPersonFamilyNameColumn = objectToCSVMap['searchPerson']['familyName']
  let pub: NormedPublication = {

    searchPerson: {
      // essentially is the object path referenced as a map
      id: Number.parseInt(row[_.toLower(objectToCSVMap['searchPerson']['id'])]),
      familyName: row[_.toLower(objectToCSVMap['searchPerson']['familyName'])],
      givenNameInitial: row[_.toLower(objectToCSVMap['searchPerson']['givenNameInitial'])],
      givenName: row[_.toLower(objectToCSVMap['searchPerson']['givenName'])],
      startDate: new Date(row[_.toLower(objectToCSVMap['searchPerson']['startDate'])]),
      endDate: new Date(row[_.toLower(objectToCSVMap['searchPerson']['startDate'])]),
      sourceIds: {
        scopusAffiliationId: row[_.toLower(objectToCSVMap['searchPerson']['sourceIds']['scopusAffiliationId'])]
      }
    },
    title: row[_.toLower(objectToCSVMap['title'])],
    journalTitle: row[_.toLower(objectToCSVMap['journalTitle'])],
    doi: row[_.toLower(objectToCSVMap['doi'])],
    publicationDate: row[_.toLower(objectToCSVMap['publicationDate'])],
    datasourceName: row[_.toLower(objectToCSVMap['datasourceName'])]
  }
  // set optional properties, for search person first check if family name provided
  if (row[_.toLower(searchPersonFamilyNameColumn)]){
    const person: NormedPerson = {
      id: row[_.toLower(objectToCSVMap['searchPerson']['id'])] ? Number.parseInt(row[_.toLower(objectToCSVMap['searchPerson']['id'])]) : undefined,
      familyName: row[_.toLower(searchPersonFamilyNameColumn)],
      givenName: row[_.toLower(objectToCSVMap['searchPerson']['givenName'])] ? row[_.toLower(objectToCSVMap['searchPerson']['givenName'])] : undefined,
      givenNameInitial: row[_.toLower(objectToCSVMap['searchPerson']['givenNameInitial'])] ? row[_.toLower(objectToCSVMap['searchPerson']['givenNameInitial'])] : undefined,
      startDate: row[_.toLower(objectToCSVMap['searchPerson']['startDate'])] ? new Date(row[_.toLower(objectToCSVMap['searchPerson']['startDate'])]) : undefined,
      endDate: row[_.toLower(objectToCSVMap['searchPerson']['endDate'])] ? new Date(row[_.toLower(objectToCSVMap['searchPerson']['endDate'])]) : undefined,
      sourceIds: row[_.toLower(objectToCSVMap['searchPerson']['sourceIds']['scopusAffiliationId'])] ? 
        { scopusAffiliationId: row[_.toLower(objectToCSVMap['searchPerson']['sourceIds']['scopusAffiliationId'])] } : {}
    }
    _.set(pub, 'searchPerson', person)
  }

  if (row[_.toLower(objectToCSVMap['abstract'])]) {
    _.set(pub, 'abstract', row[_.toLower(objectToCSVMap['abstract'])])
  }
  if (row[_.toLower(objectToCSVMap['journalIssn'])]) {
    _.set(pub, 'journalIssn', row[_.toLower(objectToCSVMap['journalIssn'])])
  }
  if (row[_.toLower(objectToCSVMap['journalEIssn'])]) {
    _.set(pub, 'journalEIssn', row[_.toLower(objectToCSVMap['journalEIssn'])])
  }
  if (row[_.toLower(objectToCSVMap['sourceId'])]) {
    _.set(pub, 'sourceId', row[_.toLower(objectToCSVMap['sourceId'])])
  }
  if (row[_.toLower(objectToCSVMap['sourceMetadata'])]) {
    // parse and get rid of any escaped quote characters
    const sourceMetadata = JSON.parse(row[_.toLower(objectToCSVMap['sourceMetadata'])])
    _.set(pub, 'sourceMetadata', sourceMetadata)
  }

  return pub
}