import axios from 'axios'
import _, { isInteger } from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import DataSourceConfig from './dataSourceConfig'
import { HarvestOperation, HarvestOperationType } from './harvestOperation'
import { wait } from '../units/randomWait'
import pMap from 'p-map'
import path from 'path'
import moment from 'moment'
import { command as loadCsv} from '../units/loadCsv'
import DataSourceHelper from './dataSourceHelper'
import ApolloClient from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import DateHelper from '../units/dateHelper'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const skipfilePath = process.env.GOOGLE_SCHOLAR_SKIP_FILE_PATH

const nameParser = require('../units/nameParser').command;
export class GoogleScholarDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig?: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  // return object with query request params
  getAuthorQuery(person: NormedPerson, startDate?: Date, endDate?: Date){
    if (person.sourceIds) {
      return `authorId:${person.sourceIds.googleScholarId}`
    } else {
      return undefined
    }
  }

  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet> {
    throw (`Unsupported operation ${HarvestOperationType.QUERY_BY_AUTHOR_NAME}`)
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorId(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    let finalTotalResults = 0
    let publications = []

    let skippedPublications = 0

    const minPublicationYear = (startDate ? startDate.getFullYear() : undefined)
    const maxPublicationYear = (endDate ? endDate.getFullYear() : undefined)

    if (!person.sourceIds || !person.sourceIds.googleScholarId) {
      throw (`Google Scholar Id not defined for Person: ${JSON.stringify(person)}`)
    }
    
    
    const skipauthorIdcsv: any = await loadCsv({
      path: skipfilePath,
      lowerCaseColumns: true
    })
    const authorId = person.sourceIds.googleScholarId[0]

    var skipauthorIds = Object.keys(skipauthorIdcsv).map(function(key){
      return skipauthorIdcsv[key]['google_scholar_id'];
    });

    // console.log(skipauthorIdcsv)
    // console.log(skipauthorIds)

    if (skipauthorIds.includes(authorId)) {
      throw(`Skipping harvest for authorId : ${authorId} as exists in skip file`)
    } else{
      //  console.log(authorId)

      // need to make sure date string in correct format
      // fetch for each possible id expecting there could be more than one
      
      await wait(this.dsConfig.requestInterval)
      const results = await this.fetchGoogleScholarAuthorData(this.dsConfig.pageSize, offset, authorId)
      // console.log (`google scholar results are: ${results}`)
      let totalResults
      if (results && results['articles']){
          totalResults = Number.parseInt(results['articles'].length)
          finalTotalResults += totalResults
          if (totalResults > 0){
              // fetch metadata for each paper 
              await wait(this.dsConfig.requestInterval)
              const papers = results['articles']
              await pMap (papers, async (paper, index) => {
              const paperId = paper['citation_id']
              let paperYear = paper['year']
              let skipPublication = false
              if (paperYear) {
                  paperYear = Number.parseInt(paperYear)              
                  if (minPublicationYear) {
                  if (paperYear < minPublicationYear) {
                      skipPublication = true
                  } else if (maxPublicationYear && paperYear > maxPublicationYear) {
                      skipPublication = true
                  }
                  }
              }
              if (!skipPublication) {
                  await wait(this.dsConfig.requestInterval)
                  console.log(`Fetching paper metadata (${(index + 1)} of ${totalResults}) for author: ${person.familyName}, ${person.givenName}`)
                  const paperMetadata = await this.fetchGoogleScholarPaperData(paperId) 
                  _.set(paperMetadata, 'citation_id', paperId) 
                  _.set(paperMetadata, 'publication_year', paperYear)       
                  publications.push(paperMetadata)
              } else {
                  console.log(`Skipping paper metadata (${(index + 1)} of ${totalResults}) for author: ${person.familyName}, ${person.givenName} with publication year: ${paperYear}`)
                  skippedPublications += 1
                  finalTotalResults = finalTotalResults.valueOf() - 1
              }
              }, { concurrency: 1 })
          }
          } else {
          finalTotalResults += 0
          }

          console.log(`Fetched ${(finalTotalResults)} publications and Skipped ${skippedPublications} publications outside of publication target range for author: ${person.familyName}, ${person.givenName}`)
          

          const result: HarvestSet = {
              sourceName: this.getSourceName(),
              searchPerson: person,
              query: `authorId:${authorId}`,
              sourcePublications: publications,
              offset: offset,
              pageSize: Number.parseInt(this.dsConfig.pageSize),
              totalResults: finalTotalResults, 
              nextPageExist: totalResults >= this.dsConfig.pageSize
          }
          // console.log(JSON.stringify(result))
          return result
    }
  }

  getPublicationSourceAuthorId (sourceMetadata: string): string {
    if (sourceMetadata && sourceMetadata['citation_id']) {
      const citationId = sourceMetadata['citation_id']
      const sourceIdParts = citationId.split(':')
      if (sourceIdParts && sourceIdParts[0]) {
        return sourceIdParts[0]
      }
    } 
    return undefined
  }


  async fetchGoogleScholarPaperData(paperId) : Promise<any> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    console.log(`Fetching google scholar paper id: ${paperId}`)

    const baseUrl = this.dsConfig.baseUrl
    const url = `${baseUrl}`
    const response = await axios.get(url, {
      headers: {
      },
      params: {
        'engine': 'google_scholar_author',
        'view_op':'view_citation',
        'citation_id': paperId,
        'api_key': this.dsConfig.apiKey,
        'hl': 'en'
        
      }
    })

    
    // _.set(response.data['citataion'], 'citation_id', paperId)
    // console.log(response.data['citation'])
    return response.data['citation']
  }
//     const SerpApi = require('google-search-results-nodejs')
//     const search = new SerpApi.GoogleSearch(this.dsConfig.apiKey)

//     const params = {
//     engine: "google_scholar_author",
//     view_op: "view_citation",
//     citation_id: paperId
//     }

//     const callback = function(data) {
//     console.log(data["citation"]);
//     }

//     // Show result as JSON
//     const response = search.json(params, callback)
    

//     return response
//   }

  async fetchGoogleScholarAuthorData(pageSize, offset, authorId, affiliation?, filter?) : Promise<any> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    console.log(`Querying google scholar offset: ${offset}, and authorId: ${authorId}`)

    // const SerpApi = require('google-search-results-nodejs')
    // const search = new SerpApi.GoogleSearch(this.dsConfig.apiKey)

    // const params = {
    //     engine: "google_scholar_author",
    //     sort: "pubdate",
    //     hl: "en",
    //     start:offset,
    //     author_id: authorId
    // }
    // let response = []
    // const callback =  async function(data) {
    //     await pMap (data["articles"], async (article) => {
    //         response.push(article)
    //     }, {concurrency: 1})
    // }

    // // Show result as JSON
    // search.json(params, callback)
    // console.log('hereee')
    // console.log(response)

    const baseUrl = this.dsConfig.baseUrl
    const url = `${baseUrl}`
    const response = await axios.get(url, {
      headers: {
      },
      params: {
        'engine': 'google_scholar_author',
        'author_id': authorId,
        'api_key': this.dsConfig.apiKey,
        'hl': 'en',
        'start': offset, 
        'num': pageSize,
        'sort': 'pubdate'
      }
    })

    // console.log('heree')
    // console.log(response.data)
    return response.data
  }

  // async fetchGoogleScholarQuery(pageSize, offset, queryAuthor?, affiliation?, filter?) : Promise<any>{
  //   console.log(`Querying google scholar offset: ${offset}, and query.author: ${queryAuthor} query.affiliation: ${affiliation} query.filter: ${filter}`)

  //   const url = 'https://api.googlescholar.org/v1/author/46276642'
  //   // const response = await axios.get(this.dsConfig.queryUrl, {
  //   const response = await axios.get(url, {
  //     headers: {
  //     },
  //     // assumes query is a set of properties for params
  //     params: {
  //       // 'query.author': queryAuthor,
  //       // 'query.affiliation': affiliation,
  //       // 'filter': filter,
  //       // 'rows': pageSize,
  //       // 'offset': offset
  //     }
  //   })

  //   return response.data
  // }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs = []
    await pMap (sourcePublications, async (pub) => {
      const authors = await this.getNormedAuthorsFromSourceMetadata(pub)
      // console.log(`Normed authors found: ${JSON.stringify(authors, null, 2)}`)
      let normedPub: NormedPublication = {
        title: pub['title'],
        doi: '',
        journalTitle: pub['journal'],
        publishedYear: Number.parseInt(`${pub['publication_year']}`),
        datasourceName: this.getSourceName(),
        sourceId: pub['citation_id'],
        sourceMetadata: pub
      }
      // add optional properties
      if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
      if (pub['description']) _.set(normedPub, 'abstract', pub['description'])
      if (pub['link']) normedPub.sourceUrl = pub['link']
      if (pub['publication_date']) normedPub.publicationDate = pub['publication_date']
      // if (pub['issn-type']) {
      //   _.each(pub['issn-type'], (issn) => {
      //     if (issn['type'] && issn['value']) {
      //       if (issn['type'] === 'electronic') {
      //         _.set(normedPub, 'journalEIssn', issn['value'])
      //       } else {
      //         _.set(normedPub, 'journalIssn', issn['value'])
      //       }
      //     }
      //   })
      // }
      console.log(`Created normed pub: ${JSON.stringify(normedPub, null, 2)}`)
      normedPubs.push(normedPub)
    }, { concurrency: 1})

    return _.filter(normedPubs, (pub) => {
      return (pub !== undefined && pub !== null)
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'GoogleScholar'
  }

  getRequestPageSize(): Number {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {

  }

  getDataSourceConfig() {
    return this.dsConfig
  }

  // returns set of coauthors for a given publication metadata harvested from google scholar with attributes like names and ids
  public static getCoauthors(sourceMetadata) {
    if (sourceMetadata && sourceMetadata['authors']) {
      return sourceMetadata['authors'].split(',')
    } else {
      return []
    }
  }

  async getCSLStyleAuthorList(sourceMetadata) {
    // const sourceAuthors = this.getCoauthors(sourceMetadata)
    // const cslStyleAuthors = []
    // await pMap(sourceAuthors, async (sourceAuthor, index) => {
    //   let author = _.clone(sourceAuthor)
    //   const parsedName = await nameParser({
    //     name: sourceAuthor['name'],
    //     reduceMethod: 'majority',
    //   });
    //   author['given'] = parsedName.first
    //   author['family'] = parsedName.last
    //   cslStyleAuthors.push(author)
    // }, { concurrency: 1 })
    const normedAuthors: NormedAuthor[] = await this.getNormedAuthorsFromSourceMetadata(sourceMetadata)
    return _.map(normedAuthors, (author) => {
      return {
        family: author.familyName,
        given: author.givenName
      }
    })
  }

  public async getNormedAuthorsFromSourceMetadata(sourceMetadata): Promise<NormedAuthor[]> {
    const sourceAuthors = GoogleScholarDataSource.getCoauthors(sourceMetadata)
    // console.log(sourceAuthors)
    const normedAuthors: NormedAuthor[] = []
    await pMap(sourceAuthors, async (sourceAuthor, index) => {
      // console.log(sourceAuthor)
      const parsedName = await nameParser({
        name: sourceAuthor,
        reduceMethod: 'majority',
      });
      console.log(`Parsed name found is: ${JSON.stringify(parsedName, null, 2)}`)
      let author: NormedAuthor = {
        familyName: parsedName['last'],
        givenName: parsedName['first'],
        givenNameInitial: (parsedName['first'] ? parsedName['first'][0] : ''),
        affiliations: [],
        sourceIds: { googleScholarId : [sourceAuthor['authorId']]}
      }
      normedAuthors.push(author)
    }, { concurrency: 1 })
    return normedAuthors
  }

  // returns map of person id to author ids
  async loadPossibleAuthorIdsFromCSV(filePath, personIdKey, authorIdKey){
    const authorIdRows: any = await loadCsv({
      path: filePath,
      lowerCaseColumns: true
    })

    
    let authorIdsByPersonId = {}
    _.each(authorIdRows, (authorIdRow) => {
      const personId = _.toLower(authorIdRow[personIdKey])
      const authorId = _.toLower(authorIdRow[authorIdKey])
      console.log(`Getting personId: ${personId} author id: ${authorId} Author Id Row: ${JSON.stringify(authorIdRow)}`)
      if (personId && authorId){
        if (!authorIdsByPersonId[personId]) {
          authorIdsByPersonId[personId] = []
        }
        if (!_.includes(authorIdsByPersonId[personId], authorId)){
          authorIdsByPersonId[personId].push(authorId)
        }
      }
    })
    console.log(`AuthorIds by person: ${JSON.stringify(authorIdsByPersonId, null, 2)}`)
    return authorIdsByPersonId
  }

  async getHarvestOperations(client: ApolloClient<NormalizedCacheObject>): Promise<HarvestOperation[]> {
    let harvestOperations: HarvestOperation[] = []
    const minYear = this.dsConfig.harvestYears[0].valueOf()
    const maxYear = this.dsConfig.harvestYears.reverse()[0].valueOf()
 
    let normedPersonsById = {}
    for (let index = 0; index <= maxYear - minYear; index++) {
      const normedPersonsByYear: NormedPerson[] = await NormedPerson.getAllNormedPersonsByYear((minYear + index), client)
      _.each (normedPersonsByYear, (normedPerson: NormedPerson) => {
        if (normedPerson.sourceIds && normedPerson.sourceIds.googleScholarId) {
          normedPersonsById[`${normedPerson.id}`] = normedPerson 
        }
      })
    }

    const normedPersons: NormedPerson[] = _.values(normedPersonsById)
    const resultsDir = path.join(this.dsConfig.harvestDataDir, `${this.dsConfig.sourceName}_${minYear}-${maxYear}_${moment().format('YYYYMMDDHHmmss')}/`)
    const dateHelper = DateHelper.createDateHelper()
    const harvestOperation: HarvestOperation = {
      harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_ID,
      normedPersons: normedPersons,
      harvestResultsDir: resultsDir,
      startDate: dateHelper.getDateObject(`${minYear}-01-01`),
      endDate: dateHelper.getDateObject(`${maxYear}-12-31`)
    }
    harvestOperations.push(harvestOperation)
    return harvestOperations
  }
}