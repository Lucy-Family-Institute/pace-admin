import _ from 'lodash'
import fs from 'fs'
import pMap from 'p-map'
import path from 'path'
import { getDateObject } from '../units/dateRange'
import { command as loadCsv } from '../units/loadCsv'
import { command as writeCsv} from '../units/writeCsv'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import writeToJSONFile from '../units/writeToJSONFile'
import readPublicationsCSLByYear from '../gql/readPublicationsCSLByYear'
import FsHelper from '../units/fsHelper'
import BibTex from './bibTex'
import Csl from './csl'
import { SemanticScholarDataSource } from './semanticScholarDataSource'
import { PubMedDataSource } from './pubmedDataSource'
import { WosDataSource } from './wosDataSource'
import { CrossRefDataSource } from './crossrefDataSource'
import DataSourceHelper from './dataSourceHelper'
import DataSource from './dataSource'
import { DataStore } from 'apollo-client/data/store'
export default class NormedPublication {
  // ------ begin declare properties used when using NormedPublication like an interface

  // the normalized simple form of a publication across all sources
  id?: number
  searchPerson?: NormedPerson
  abstract?: string
  title: string
  journalTitle?: string
  authors?: NormedAuthor[]
  confirmedAuthors?: NormedAuthor[]
  journalIssn?: string
  journalEIssn?: string
  doi: string
  publicationDate: string
  datasourceName: string
  sourceId?: string
  sourceUrl?: string
  publisher?: string
  number?: string
  volume?: string
  pages?: string
  bibtex?: string
  sourceMetadata?: Object
  csl?: Object
  csl_string?: string
  
  public static getDataSource(normedPub: NormedPublication): DataSource {
    if (normedPub) {
      if (normedPub.datasourceName) {
        return DataSourceHelper.getDataSource(normedPub.datasourceName)
      } else {
        throw('Unable to get data source object if data source name is undefined.')
      }
    } else {
      throw('Unable to get data source object if normedPub is undefined.')
    }
  }
  // ------- end declare properties used when using NormedPublication like an interface

  // begin declaring static utility methods for NormedPublication objects
  //-----------------------------------------------------------------------
  /**
   * 
   * @param csvPath the path the csv file containing the publications to be loaded
   * 
   * @param columnNameMap a map of column names in the csv to harvestset property names, if not defined uses default path from configuration
   * @param dataDirPath path to dir containing JSON files for sourceMetadata
   * @param pageOffset if provided gives the page index if results are broken into blocks of results (i.e., pages)
   * @param pageSize optional param if set will return a block of results at the page index with number results returned as this pageSize
   * @returns object with array of raw publication set as well as hash of doi to index of corresponding publication in array
   */
  public static async loadFromCSV (csvPath: string, dataDirPath?: string, pageOffset=0, pageSize?: number): Promise<NormedPublication[]> {
    console.log(`Loading Papers from path: ${csvPath}`)
    // ingest list of DOI's from CSV and relevant center author name
    try {

      const objectToCSVMap = NormedPublication.loadNormedPublicationObjectToCSVMap()

      const authorPapers: any = await loadCsv({
        path: csvPath,
        lowerCaseColumns: true,
        pageOffset: pageOffset,
        pageSize: pageSize
      })

      let sourceName = undefined
      if (authorPapers.length > 0){
        sourceName = authorPapers[0]['sourcename']
      }

      return _.map(authorPapers, (paper) => {
        let pub: NormedPublication = NormedPublication.getNormedPublicationObjectFromCSVRow(paper, objectToCSVMap)
        if (dataDirPath) {
          let sourceFileName
          let sourceFilePath
          try {
            sourceFileName = NormedPublication.getSourceMetadataFileName(pub)
            sourceFilePath = path.join(process.cwd(), NormedPublication.getSourceMetadataDirPath(dataDirPath), sourceFileName)
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
    if (pub.datasourceName && pub.sourceId) {
      const fileName = `${pub.datasourceName}_${pub.sourceId.replace(/\//g, '_')}.json`
      return fileName
    } else {
      return undefined
    }
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
    if (pub.sourceUrl) {
      row[objectToCSVMap['sourceUrl']] = pub.sourceUrl
    }
    if (pub.publisher) {
      row[objectToCSVMap['publisher']] = pub.publisher
    }
    if (pub.number) {
      row[objectToCSVMap['number']] = pub.number
    }
    if (pub.volume) {
      row[objectToCSVMap['volume']] = pub.volume
    }
    if (pub.pages) {
      row[objectToCSVMap['pages']] = pub.pages
    }
    if (pub.authors) {
      row[objectToCSVMap['authors']] = JSON.stringify(pub.authors)      
    }
    if (pub.confirmedAuthors) {
      row[objectToCSVMap['confirmedAuthors']] = JSON.stringify(pub.confirmedAuthors)
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

  public static loadNormedPublicationObjectToDBMap(filePath = "./modules/normedPublicationObjectToDBMap.json", filesystem = fs) {
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

  // will return a list of publications for the given year
  public static async loadPublicationsFromDB(client, year): Promise<NormedPublication[]> {
    const queryResult = await client.query(readPublicationsCSLByYear(year))
    return this.getNormedPublicationsFromDBRows(queryResult.data.publications) 
  }

  public static getNormedPublicationsFromDBRows(rows): NormedPublication[] {
    let normedPubs = []
    const objectToDBMap = NormedPublication.loadNormedPublicationObjectToDBMap()
    _.each(rows, (row) => {
      const normedPub = this.getNormedPublicationFromDBRow(row, objectToDBMap)
      if (normedPub) normedPubs.push(normedPub)
    })
    return normedPubs
  }

  public static getNormedPublicationFromDBRow(row, objectToDBMap): NormedPublication{
    // this should work with the object map swapped out
    return NormedPublication.getNormedPublicationObjectFromCSVRow(row, objectToDBMap)
  }

  /**
   * Expects the map to be used in defining column_names to pull properties for each leaf of NormedPublication object 
   * (e.g., for the searchPerson property there is an object that defines a column name for each item that equates to a string)
   * @param row 
   */
  public static getNormedPublicationObjectFromCSVRow(row, objectToCSVMap): NormedPublication {
    // assumes all column names in row passed in have been converted to lowercase
    const searchPersonFamilyNameColumn = (objectToCSVMap['searchPerson'] && objectToCSVMap['searchPerson']['familyName'] ? objectToCSVMap['searchPerson']['familyName'] : undefined)
    let pub: NormedPublication = {
      title: (row[_.toLower(objectToCSVMap['title'])] ? row[_.toLower(objectToCSVMap['title'])] : row[_.keys(row)[0]]),
      doi: row[_.toLower(objectToCSVMap['doi'])],
      publicationDate: row[_.toLower(objectToCSVMap['publicationDate'])],
      datasourceName: row[_.toLower(objectToCSVMap['datasourceName'])],
      authors: (row[_.toLower(objectToCSVMap['authors'])] ? JSON.parse(row[_.toLower(objectToCSVMap['authors'])]) : undefined)
    }
    // set optional properties, for search person first check if family name provided
    if (searchPersonFamilyNameColumn && row[_.toLower(searchPersonFamilyNameColumn)]){
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

    if (objectToCSVMap['id'] && row[_.toLower(objectToCSVMap['id'])]) {
      _.set(pub, 'id', row[_.toLower(objectToCSVMap['id'])])
    }
    if (objectToCSVMap['journalTitle'] && row[_.toLower(objectToCSVMap['journalTitle'])]) {
      _.set(pub, 'journalTitle', row[_.toLower(objectToCSVMap['journalTitle'])])
    }
    if (objectToCSVMap['abstract'] && row[_.toLower(objectToCSVMap['abstract'])]) {
      _.set(pub, 'abstract', row[_.toLower(objectToCSVMap['abstract'])])
    }
    if (objectToCSVMap['journalIssn'] && row[_.toLower(objectToCSVMap['journalIssn'])]) {
      _.set(pub, 'journalIssn', row[_.toLower(objectToCSVMap['journalIssn'])])
    }
    if (objectToCSVMap['journalEIssn'] && row[_.toLower(objectToCSVMap['journalEIssn'])]) {
      _.set(pub, 'journalEIssn', row[_.toLower(objectToCSVMap['journalEIssn'])])
    }
    if (objectToCSVMap['sourceId'] && row[_.toLower(objectToCSVMap['sourceId'])]) {
      _.set(pub, 'sourceId', row[_.toLower(objectToCSVMap['sourceId'])])
    }
    if (objectToCSVMap['sourceUrl'] && row[_.toLower(objectToCSVMap['sourceUrl'])]) {
      _.set(pub, 'sourceUrl', row[_.toLower(objectToCSVMap['sourceUrl'])])
    }
    if (objectToCSVMap['publisher'] && row[_.toLower(objectToCSVMap['publisher'])]) {
      _.set(pub, 'publisher', row[_.toLower(objectToCSVMap['publisher'])])
    }
    if (objectToCSVMap['number'] && row[_.toLower(objectToCSVMap['number'])]) {
      _.set(pub, 'number', row[_.toLower(objectToCSVMap['number'])])
    }
    if (objectToCSVMap['volume'] && row[_.toLower(objectToCSVMap['volume'])]) {
      _.set(pub, 'volume', row[_.toLower(objectToCSVMap['volume'])])
    }
    if (objectToCSVMap['pages'] && row[_.toLower(objectToCSVMap['pages'])]) {
      _.set(pub, 'pages', row[_.toLower(objectToCSVMap['pages'])])
    }
    if (objectToCSVMap['bibtex'] && row[_.toLower(objectToCSVMap['bibtex'])]) {
      _.set(pub, 'bibtex', row[_.toLower(objectToCSVMap['bibtex'])])
    }
    if (objectToCSVMap['confirmedAuthors'] && row[_.toLower(objectToCSVMap['confirmedAuthors'])]) {
      _.set(pub, 'confirmedAuthors', NormedPublication.getConfirmedNormedAuthors(row[_.toLower(objectToCSVMap['confirmedAuthors'])]))
    }
    if (objectToCSVMap['sourceMetadata'] && row[_.toLower(objectToCSVMap['sourceMetadata'])]) {
      // parse and get rid of any escaped quote characters
      const value = row[_.toLower(objectToCSVMap['sourceMetadata'])]
      if (_.isString(value)) {
        _.set(pub, 'sourceMetadata', JSON.parse(row[_.toLower(objectToCSVMap['sourceMetadata'])]))
      } else {
        _.set(pub, 'sourceMetadata', value)        
      }
    }
    if (objectToCSVMap['csl'] && row[_.toLower(objectToCSVMap['csl'])]) {
      // parse and get rid of any escaped quote characters
      const value = row[_.toLower(objectToCSVMap['csl'])]
      if (_.isString(value)) {
        _.set(pub, 'csl', JSON.parse(row[_.toLower(objectToCSVMap['csl'])]))
      } else {
        _.set(pub, 'csl', value)        
      }
    }
    if (objectToCSVMap['csl_string'] && row[_.toLower(objectToCSVMap['csl_string'])]) {
      // parse and get rid of any escaped quote characters
      const value = row[_.toLower(objectToCSVMap['csl_string'])]
      _.set(pub, 'csl_string', value)        
    }

    return pub
  }

  // parse the format in the input csv file to be names separated by ';' and name of form 'family, given'
  public static getConfirmedNormedAuthors(confirmedAuthorString: string): NormedAuthor[] {
    //split by ; and then name by ,
    const names = _.split(confirmedAuthorString, ';')
    const normed: NormedAuthor[] = []
    const confirmed = _.each(names, (name: string) => {
      const obj = _.split(name, ',')
      const familyName = (obj[0] ? obj[0].trim() : '')
      const givenName = (obj[1] ? obj[1].trim() : '')
      const author: NormedAuthor = {
        familyName: familyName,
        givenName: givenName,
        givenNameInitial: (givenName && givenName[0] ? givenName[0] : ''),
        affiliations: [],
        sourceIds: {}
      }
      normed.push(author)
    })
    return normed
  }

  public static async getConfirmedAuthorsByDoiFromCSV (path) {
    try {
      const normedPubs = await NormedPublication.loadFromCSV(path)
      const normedPubsByDoi = _.groupBy(normedPubs, function(normedPub) {
        return normedPub.doi
      })
      console.log(`Confirmed Papers by DOI Count: ${JSON.stringify(_.keys(normedPubsByDoi).length,null,2)}`)

      //check if confirmed column exists first, if not ignore this step
      let confirmedAuthorsByDoi = {}
      if (normedPubsByDoi && _.keys(normedPubsByDoi).length > 0){
        //get map of DOI's to an array of confirmed authors from the load table
        confirmedAuthorsByDoi = await NormedPublication.getConfirmedAuthorsByDoi(normedPubsByDoi)

      }
      return confirmedAuthorsByDoi
    } catch (error){
      console.log(`Error on load confirmed authors: ${error}`)
      return {}
    }
  }

  public static async getConfirmedAuthorsByDoi (normedPubsByDoi) {
    const confirmedAuthorsByDoi = _.mapValues(normedPubsByDoi, function (normedPubs: NormedPublication[]) {
      return _.mapValues(normedPubs, function (normedPub: NormedPublication) {
        return normedPub.confirmedAuthors
      })
    })
    return confirmedAuthorsByDoi
  }

  public static async getAuthors (normedPub: NormedPublication): Promise<NormedAuthor[]> {
    if (normedPub.authors) {
      return normedPub.authors
    } else {
      return await this.getAuthorsFromSourceMetadata(normedPub)
    }
  }

  public static async getAuthorsFromSourceMetadata (normedPub: NormedPublication): Promise<NormedAuthor[]> {
    const ds: DataSource = NormedPublication.getDataSource(normedPub)
    return await ds.getNormedAuthorsFromSourceMetadata(normedPub.sourceMetadata)
  }

  public static async getCslByBibTex(normedPub: NormedPublication) : Promise<Csl> {
    let bibTexStr = undefined
    let normedBibTex: BibTex = undefined
    let csl: Csl
    if (!normedPub.bibtex) {
      normedBibTex = await NormedPublication.getBibTex(normedPub)
      // console.log(`Normed bib tex is: ${JSON.stringify(normedBibTex, null, 2)}`)
      if (normedBibTex) bibTexStr = BibTex.toString(normedBibTex)
    } else {
      bibTexStr = normedPub.bibtex
    }
    if (bibTexStr) {
      // console.log(`Trying to get csl from bibtex str doi: ${doi}, for bibtex str ${bibTexStr} found...`)
      try {
         csl = await Csl.getCsl(bibTexStr)
      } catch (error) {
        // try it without the abstract
        let newBibTex
        try {
          if (normedBibTex) {
            console.log('Error encountered on bibTex, trying without abstract...')
            newBibTex = BibTex.toString(normedBibTex, true)
            csl = await Csl.getCsl(newBibTex)
          }
        } catch (error) {
          console.log(`Errored on csl from bibtex w/ or w/out abstract: ${bibTexStr}, error: ${error}`)
          throw (error)
        }
      }
    } else {
      throw ('Bibtex not defined properly')
    }
    if (csl && !csl.valueOf()['DOI']) {
      if (normedBibTex && normedBibTex.doi) {
        csl.setDoi(normedBibTex.doi)
      } else if (normedPub.doi) {
        csl.setDoi(normedPub.doi)
      }
    }
    return csl
  }

  // if default to bibtex is true then it skips retrieval by doi, and constructs the csl from bibtex
  public static async getCsl (normedPub: NormedPublication, defaultToBibTex = false): Promise<Csl> {
    let cslRecords = undefined
    let csl: Csl = undefined
    try {
      if (defaultToBibTex && normedPub.bibtex) {
        csl = await NormedPublication.getCslByBibTex(normedPub)
      } else {
        csl = await Csl.getCsl(normedPub.doi)
      }
    } catch (error) {
      try {
        if (defaultToBibTex && normedPub.bibtex) {
          console.log(`Throwing the error for doi: ${normedPub.doi}`)
          throw (error)
        } else {
          // try by bibtex
          csl = await NormedPublication.getCslByBibTex(normedPub)
        }
      } catch (error) {
        console.log(`Throwing the error for doi: ${normedPub.doi}`)
        throw (error)
      }
    }
    // console.log(`Csl found is: ${JSON.stringify(csl, null, 2)}`)
    return csl 
  }

  public static async getBibTex (normedPub: NormedPublication): Promise<BibTex> {
    const date: Date = getDateObject(normedPub.publicationDate)
    
    const authors = await NormedPublication.getAuthors(normedPub)
    let bib: BibTex = {
      title: normedPub.title,
      journal: normedPub.journalTitle,
      year: (date ? `${date.getFullYear()}` : ''),
      author: BibTex.getBibTexAuthors(authors),
    }
    
    // optional properties
    if (normedPub.publisher) bib.publisher = normedPub.publisher
    if (normedPub.sourceUrl) bib.url = normedPub.sourceUrl
    if (normedPub.journalIssn) bib.issn = normedPub.journalIssn
    if (normedPub.doi) bib.doi = normedPub.doi
    if (normedPub.abstract) bib.abstract = normedPub.abstract
    if (normedPub.number) bib.number = normedPub.number
    if (normedPub.volume) bib.volume = normedPub.volume
    if (normedPub.pages) bib.pages = normedPub.pages

    return bib
  }

  public static getDoiKey (normedPub: NormedPublication): string {
    if (!normedPub.doi || normedPub.doi.length <= 0){
      return NormedPublication.getSourceKey(normedPub)
    } else {
      return normedPub.doi
    }
  }

  public static getSourceKey (normedPub: NormedPublication): string {
    return `${normedPub.datasourceName}_${normedPub.sourceId}`
  }
}