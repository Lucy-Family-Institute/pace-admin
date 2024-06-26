import axios from 'axios'
import _ from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import { HarvestOperation, HarvestOperationType } from './harvestOperation'
import DataSourceConfig from './dataSourceConfig'
import { PossibleFragmentSpreadsRule } from 'graphql'
import DataSourceHelper from './dataSourceHelper'
import Csl from './csl'
import CslDate from './cslDate'
import pMap from 'p-map'
import path from 'path'
import moment from 'moment'
import ApolloClient from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import DateHelper from '../units/dateHelper'

export class CrossRefDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig?: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  // return object with query request params
  getAuthorQuery(person: NormedPerson, startDate?: Date, endDate?: Date){

    let startDateStr
    let endDateStr
    if (startDate) {
      startDateStr = `${startDate.getFullYear()}-01-01`
    }
    if (endDate) {
      endDateStr = `${endDate.getFullYear()}-12-31`
    }
    //let authorQuery = "query.author="+person.givenName+"+"+person.familyName+"&query.affiliation=notre+dame"
    let filter
    if (startDate) {
      if (endDate) {
        filter = `from-pub-date:${startDateStr},until-pub-date:${endDateStr}`
      } else {
        filter = `from-pub-date:${startDateStr}`
      } 
    } else if (endDate) {
      filter = `until-pub-date:${endDateStr}`
    }
    const authorQuery = {
      'query.author': _.toLower(person.givenName)+"+"+_.toLower(person.familyName),
      'query.affiliation': 'notre+dame',
      'filter': filter
    }
    return authorQuery
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    const query = this.getAuthorQuery(person, startDate, endDate)

    let totalResults: Number
    let publications = []
    let itemsPerPage = undefined

    const recordLimit = 300
    //first trying running without affiliation and see what results are returned
    //if below limit than run without filter, otherwise apply
    let affiliation = undefined
    let results = await this.fetchCrossRefResults(this.dsConfig.pageSize, offset, query['query.author'], affiliation, query['filter'])
    console.log(`CrossRef records found w/out affiliation filter, totalResults: ${results.totalResults} offset: ${offset}`)
    if (results.totalResults <= recordLimit) {
      console.log(`CrossRef getting records w/out affiliation filter, totalResults: ${results.totalResults} offset: ${offset}`)
      totalResults = results.totalResults
      publications = results.publications
      itemsPerPage = results.itemsPerPage
    } else {
      // need to make sure date string in correct format
      console.log(`CrossRef getting records w/ affiliation filter, offset: ${offset}`)
      results = await this.fetchCrossRefResults(this.dsConfig.pageSize, offset, query['query.author'], query['query.affiliation'], query['filter'])
      if (results.totalResults) {
        totalResults = results.totalResults
        publications = results.publications
        itemsPerPage = results.itemsPerPage
      } else {
        totalResults = 0
      }
    }
    // console.log(`CrossRef results are: ${JSON.stringify(results['message']['items'][0], null, 2)}`)
    // console.log(`CrossRef results are: ${JSON.stringify(_.keys(results['message']), null, 2)}`)
    // console.log(`CrossRef results facets are: ${JSON.stringify(results['message']['facets'], null, 2)}`)
    console.log(`CrossRef results total-results are: ${JSON.stringify(totalResults, null, 2)}`)
    console.log(`CrossRef results items-per-page are: ${JSON.stringify(itemsPerPage, null, 2)}`)
    // console.log(`CrossRef results query is: ${JSON.stringify(results['message']['query'], null, 2)}`)


    const result: HarvestSet = {
        sourceName: this.getSourceName(),
        searchPerson: person,
        query: JSON.stringify(query),
        sourcePublications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: totalResults
    }

    return result
  }

  async fetchCrossRefResults(pageSize, offset, queryAuthor, affiliation?, filter?) : Promise<any>{
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    // need to make sure date string in correct format
    let totalResults
    let publications
    let itemsPerPage
    const results = await this.fetchCrossRefQuery(this.dsConfig.pageSize, offset, queryAuthor, affiliation, filter)
    if (results && results['message'] && results['message']['total-results']){
      totalResults = Number.parseInt(results['message']['total-results'])
      itemsPerPage = results['message']['items-per-page']
      if (totalResults > 0 && results['message']['items']){
        publications = results['message']['items']
      }
    }
    return {
      totalResults: totalResults,
      publications: publications,
      itemsPerPage: itemsPerPage
    } 
  }

  async fetchCrossRefQuery(pageSize, offset, queryAuthor, affiliation?, filter?) : Promise<any>{
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    console.log(`Querying crossref offset: ${offset}, and query.author: ${queryAuthor} query.affiliation: ${affiliation} query.filter: ${filter}`)

    const response = await axios.get(this.dsConfig.queryUrl, {
      headers: {
      },
      // assumes query is a set of properties for params
      params: {
        'query.author': queryAuthor,
        'query.affiliation': affiliation,
        'filter': filter,
        'rows': pageSize,
        'offset': offset
      }
    })

    return response.data
  }

  async getNormedAuthorsFromSourceMetadata(sourceMetadata): Promise<NormedAuthor[]> {
    return Csl.cslToNormedAuthors(await this.getCSLStyleAuthorList(sourceMetadata))
  }

  async getCSLStyleAuthorList(paperCsl): Promise<any[]>{

    const authMap = {
      firstAuthors : [],
      otherAuthors : []
    }
  
    let authorCount = 0
    if (paperCsl){
      _.each(paperCsl.author, async (author) => {
        // skip if family_name undefined
        if (author.family != undefined){
          authorCount += 1
    
          //if given name empty change to empty string instead of null, so that insert completes
          if (author.given === undefined) author.given = ''
    
          if (_.lowerCase(author.sequence) === 'first' ) {
            authMap.firstAuthors.push(author)
          } else {
            authMap.otherAuthors.push(author)
          }
        }
      })
    }
  
    //add author positions
    authMap.firstAuthors = _.forEach(authMap.firstAuthors, function (author, index){
      author.position = index + 1
    })
  
    authMap.otherAuthors = _.forEach(authMap.otherAuthors, function (author, index){
      author.position = index + 1 + authMap.firstAuthors.length
    })
  
    //concat author arrays together
    const authors = _.concat(authMap.firstAuthors, authMap.otherAuthors)
  
    return authors
  }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs: NormedPublication[] = []
    await pMap(sourcePublications, async (pub) => {
      let publicationDate: CslDate = Csl.getPublicationDate(await Csl.getCsl(pub))
      let normedPub: NormedPublication = {
          title: pub['title'][0],
          journalTitle: pub['container-title'] ? pub['container-title'][0] : (pub['short-container-title'] ? pub['short-containter-title'] : ''),
          publishedYear: publicationDate.year,
          publishedMonth: publicationDate.month,
          publishedDay: publicationDate.day,
          datasourceName: this.getSourceName(),
          doi: pub['DOI'] ? pub['DOI'] : '',
          sourceId: pub['DOI'] ? pub['DOI'] : '',
          authors: await this.getNormedAuthorsFromSourceMetadata(pub),
          sourceUrl: pub['URL'] ? pub['URL'] : '', 
          number: pub['issue'] ? pub['issue'] : '',
          publisher: pub['publisher'] ? pub['publisher'] : '',
          volume: pub['volume'] ? pub['volume'] : '',
          sourceMetadata: pub,
          
      }
      // console.log(`Setting search person for normed pubs: ${JSON.stringify(searchPerson, null, 2)}`)
      // add optional properties
      if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
      // if (pub['abstract']) _.set(normedPub, 'abstract', pub['abstract'])
      if (pub['issn-type']) {
        _.each(pub['issn-type'], (issn) => {
          if (issn['type'] && issn['value']) {
            if (issn['type'] === 'electronic') {
              _.set(normedPub, 'journalEIssn', issn['value'])
            } else {
              _.set(normedPub, 'journalIssn', issn['value'])
            }
          }
        })
      }
      // console.log(`Created normed pub: ${JSON.stringify(normedPub, null, 2)}`)
      normedPubs.push(normedPub)
    })

    return _.filter(normedPubs, (pub) => {
      return (pub !== undefined && pub !== null)
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'CrossRef'
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

  async getHarvestOperations(organizationValue, client: ApolloClient<NormalizedCacheObject>): Promise<HarvestOperation[]> {
    const dateHelper = DateHelper.createDateHelper()
    let harvestOperations: HarvestOperation[] = []
    const years = this.dsConfig.harvestYears
    await pMap(years, async (year) => {
      const normedPersons: NormedPerson[] = await NormedPerson.getNormedPersons(year.valueOf(),organizationValue, client)
      const resultsDir = path.join(this.dsConfig.harvestDataDir, `${this.dsConfig.sourceName}_${year}_${moment().format('YYYYMMDDHHmmss')}/`)
      const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: normedPersons,
        harvestResultsDir: resultsDir,
        startDate: dateHelper.getDateObject(`${year}-01-01`),
        endDate: dateHelper.getDateObject(`${year}-12-31`)
      }
      harvestOperations.push(harvestOperation)
    }, { concurrency: 1 })
    return harvestOperations
  }
  
}