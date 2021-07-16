import _ from 'lodash'
import fs from 'fs'
import pMap from 'p-map'
import path from 'path'
import { getDateObject } from '../units/dateRange'
import { command as loadCsv } from '../units/loadCsv'
import { command as writeCsv} from '../units/writeCsv'
import NormedPerson from './normedPerson'
import writeToJSONFile from '../units/writeToJSONFile'
import { loadJSONFromFile } from '../units/loadJSONFromFile'

export default class NormedPublication {
  // ------ begin declare properties used when using NormedPublication like an interface

  // the normalized simple form of a publication across all sources
  searchPerson?: NormedPerson
  abstract?: string
  title: string
  journalTitle: string
  journalIssn?: string
  journalEIssn?: string
  doi: string
  publicationDate: string
  datasourceName: string
  sourceId?: string
  sourceMetadata?: Object
  // ------- end declare properties used when using NormedPublication like an interface

  // begin declaring static utility methods for NormedPublication objects
  //-----------------------------------------------------------------------
  /**
   * 
   * @param csvPath the path the csv file containing the publications to be loaded
   * 
   * @param columnNameMap a map of column names in the csv to harvestset property names, if not defined uses default path from configuration
   * @param dataDirPath path to dir containing JSON files for sourceMetadata
   * @returns object with array of raw publication set as well as hash of doi to index of corresponding publication in array
   */
  public static async loadFromCSV (csvPath: string, dataDirPath?: string): Promise<NormedPublication[]> {
    console.log(`Loading Papers from path: ${csvPath}`)
    // ingest list of DOI's from CSV and relevant center author name
    try {

      const objectToCSVMap = NormedPublication.loadNormedPublicationObjectToCSVMap()

      const authorPapers: any = await loadCsv({
        path: csvPath,
        lowerCaseColumns: true
      })

      let sourceName = undefined
      if (authorPapers.length > 0){
        sourceName = authorPapers[0]['sourcename']
      }

      return _.map(authorPapers, (paper) => {
        let pub: NormedPublication = NormedPublication.getNormedPublicationObjectFromCSVRow(paper, objectToCSVMap)
        if (dataDirPath) {
          const sourceFileName = NormedPublication.getSourceMetadataFileName(pub)
          const sourceFilePath = path.join(process.cwd(), NormedPublication.getSourceMetadataDirPath(dataDirPath), sourceFileName)
          try {
            pub.sourceMetadata = NormedPublication.loadNormedPublicationSourceMetadata(sourceFilePath)
          } catch (error) {
            console.log(`Warning failed to load source metadata from JSON for filePath: ${sourceFilePath} with error: ${error}`)
          }
        }
        return pub
      })
    } catch (error){
      console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
      throw error
    }
  }

  /**
   * Write out an array of NormedPublication objects to a CSV file
   * 
   * @param pubs An array of NormedPublications to write to CSV
   * @param filePath the path for the file to write
   */
  public static async writeToCSV(pubs: NormedPublication[], filePath: string) {

    const objectToCSVMap = NormedPublication.loadNormedPublicationObjectToCSVMap()
    const output = _.map(pubs, (pub) => {
      return NormedPublication.getCSVRow(pub, objectToCSVMap)
    })
   
    //write data out to csv
    await writeCsv({
      path: filePath,
      data: output
    });
  }

  public static getSourceMetadataDirPath(parentDir: string) {
    return path.join(parentDir, 'source_metadata')
  }

  public static getSourceMetadataFileName(pub: NormedPublication): string {
    const fileName = `${pub.datasourceName}_${pub.sourceId.replace(/\//g, '_')}.json`
    return fileName
  }

  public static async writeSourceMetadataToJSON(pubs: NormedPublication[], dataDir) {
    await pMap(pubs, async (pub) => { 
      const jsonFileDir = path.join(process.cwd(), NormedPublication.getSourceMetadataDirPath(dataDir))
      if (!fs.existsSync(jsonFileDir)){
        fs.mkdirSync(jsonFileDir);
      }
      const filePath = path.join(jsonFileDir, NormedPublication.getSourceMetadataFileName(pub))
      const sourceMetadata = pub.sourceMetadata
      if (sourceMetadata) {
        console.log(`Writing source metadata file: ${filePath}`)
        await writeToJSONFile(sourceMetadata, filePath)
      }
    }, { concurrency: 1})
  }

  public static getCSVRow(pub: NormedPublication, objectToCSVMap): {} {
    let row = {}
    if (pub.searchPerson){
      row[objectToCSVMap['searchPerson']['id']] = pub.searchPerson.id
      row[objectToCSVMap['searchPerson']['familyName']] = pub.searchPerson.familyName
      row[objectToCSVMap['searchPerson']['givenNameInitial']] = pub.searchPerson.givenNameInitial
      row[objectToCSVMap['searchPerson']['givenName']] = pub.searchPerson.givenName
      row[objectToCSVMap['searchPerson']['startDate']] = pub.searchPerson.startDate
      row[objectToCSVMap['searchPerson']['endDate']] = (pub.searchPerson.endDate) ? pub.searchPerson.endDate : undefined
      if (pub.searchPerson.sourceIds.scopusAffiliationId) {
        row[objectToCSVMap['searchPerson']['sourceIds']['scopusAffiliationId']] = pub.searchPerson.sourceIds.scopusAffiliationId
      }
    }
    row[objectToCSVMap['title']] = pub.title
    row[objectToCSVMap['journalTitle']] = pub.journalTitle
    row[objectToCSVMap['doi']] = pub.doi
    row[objectToCSVMap['publicationDate']] = pub.publicationDate
    row[objectToCSVMap['datasourceName']] = pub.datasourceName

    if (pub.abstract) {
      row[objectToCSVMap['abstract']] = pub.abstract
    }
    if (pub.journalIssn) {
      row[objectToCSVMap['journalIssn']] = pub.journalIssn
    }
    if (pub.journalEIssn) {
      row[objectToCSVMap['journalEIssn']] = pub.journalEIssn
    }
    if (pub.sourceId) {
      row[objectToCSVMap['sourceId']] = pub.sourceId
    }
    // if (pub.sourceMetadata) {
    //   // parse and get rid of any escaped quote characters
    //   row[objectToCSVMap['sourceMetadata']] = JSON.stringify(pub.sourceMetadata)
    // }

    return row
  }

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
  public static loadNormedPublicationObjectToCSVMap(filePath = "./modules/normedPublicationObjectToCSVMap.json", filesystem = fs) {
    if (!filesystem.existsSync(filePath)) {
      throw `Invalid path on load json from: ${filePath}`
    }
    let raw = filesystem.readFileSync(filePath, 'utf8')
    let json = JSON.parse(raw);
    return json
  }

  public static loadNormedPublicationSourceMetadata(filePath, filesystem = fs) {
    if (!filesystem.existsSync(filePath)) {
      throw `Invalid path on load json from: ${filePath}`
    }
    let raw = filesystem.readFileSync(filePath, 'utf8')
    let json = JSON.parse(raw);
    return json
  }

  /**
   * Expects the map to be used in defining column_names to pull properties for each leaf of NormedPublication object 
   * (e.g., for the searchPerson property there is an object that defines a column name for each item that equates to a string)
   * @param row 
   */
  public static getNormedPublicationObjectFromCSVRow(row, objectToCSVMap): NormedPublication {
    // assumes all column names in row passed in have been converted to lowercase
    const searchPersonFamilyNameColumn = objectToCSVMap['searchPerson']['familyName']
    let pub: NormedPublication = {

      title: (row[_.toLower(objectToCSVMap['title'])] ? row[_.toLower(objectToCSVMap['title'])] : row[_.keys(row)[0]]),
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
        startDate: row[_.toLower(objectToCSVMap['searchPerson']['startDate'])] ? getDateObject(row[_.toLower(objectToCSVMap['searchPerson']['startDate'])]) : undefined,
        endDate: row[_.toLower(objectToCSVMap['searchPerson']['endDate'])] ? getDateObject(row[_.toLower(objectToCSVMap['searchPerson']['endDate'])]) : undefined,
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
}