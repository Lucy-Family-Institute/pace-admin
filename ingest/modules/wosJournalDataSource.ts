import axios from 'axios'
import _ from 'lodash'
import pMap from 'p-map'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import DateHelper from '../units/dateHelper'
import { HarvestOperation, HarvestOperationType } from './harvestOperation'
import DataSourceConfig from './dataSourceConfig'
import DataSourceHelper from './dataSourceHelper'
import NormedAuthor from './normedAuthor'
import ApolloClient from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import path from 'path'
import moment from 'moment'

export class WosJournalDataSource implements DataSource {

  private dsConfig: DataSourceConfig

  constructor (dsConfig?: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  async getCSLStyleAuthorList(sourceMetadata): Promise<any[]> {
    // do nothing for now
    return []
  }

  // return the query passed to scopus for searching for given author
  getAuthorQuery(person: NormedPerson){
    let authorQuery = "AUTHFIRST("+ _.toLower(person.givenNameInitial) +") and AUTHLASTNAME("+ _.toLower(person.familyName) +")"
    if (person.sourceIds.scopusAffiliationId){
      authorQuery = authorQuery+" and AF-ID("+person.sourceIds.scopusAffiliationId+")" 
    } 
    return authorQuery
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    const authorQuery = this.getAuthorQuery(person)

    let totalResults: Number
    let publications = []

    // scopus accepts only year for date search
    let dateFilter = `${startDate.getFullYear()}`
    if (endDate) {
      //add end date to range if provided
      dateFilter = `${dateFilter}-${endDate.getFullYear()}`
    }

    // need to make sure date string in correct format
    const results = await this.fetchWosJournalsQuery(authorQuery, dateFilter, this.dsConfig.pageSize, offset)
    console.log(`WoS Journal Output is: ${JSON.parse(results)}`)
    // if (results && results['search-results']['opensearch:totalResults']){
    //     const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
    //     if (totalResults > 0 && results['search-results']['entry']){
    //         publications = results['search-results']['entry']
    //     }
    // } else {
    //   totalResults = 0
    // }
    const result: HarvestSet = {
        sourceName: this.getSourceName(),
        searchPerson: person,
        query: authorQuery,
        sourcePublications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: totalResults
    }

    return result
  }

  async fetchWosJournalsQuery(query, date, pageSize, offset) : Promise<any>{
    console.log(`Querying Wos Journals with date: ${date}, offset: ${offset}, and query: ${query}`)
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    const response = await axios.get(this.dsConfig.queryUrl, {
      headers: {
        'X-ELS-APIKey' : this.dsConfig.apiKey,
      },
      params: {
        query: query,
        date: date,
        count: JSON.stringify(pageSize),
        start: offset
      }
    })

    return response.data
  }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs: NormedPublication[] = []
    await pMap(sourcePublications, async (pub) => {
        const dateParts = (pub['prism:coverDate'] ? _.split(pub['prism:coverDate'], '-') : [])
        const publishedYear = dateParts[0]
        let publishedMonth
        let publishedDay
        if (dateParts.length > 1) {
          publishedMonth = dateParts[1]
          if (dateParts.length > 2) {
            publishedDay = dateParts[2]
          }
        }
        let normedPub: NormedPublication = {
            title: pub['dc:title'],
            journalTitle: pub['prism:publicationName'],
            publishedYear: Number.parseInt(`${publishedYear}`),
            publishedMonth: publishedMonth,
            publishedDay: publishedDay,
            datasourceName: this.getSourceName(),
            doi: pub['prism:doi'] ? pub['prism:doi'] : '',
            sourceId: _.replace(pub['dc:identifier'], 'SCOPUS_ID:', ''),
            authors: await this.getNormedAuthorsFromSourceMetadata(pub),
            sourceMetadata: pub
        }
        // add optional properties
        if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
        if (pub['abstract']) _.set(normedPub, 'abstract', pub['abstract'])
        if (pub['prism:issn']) _.set(normedPub, 'journalIssn', pub['prism:issn'])
        if (pub['prism:eIssn']) _.set(normedPub, 'journalEIssn', pub['prism:eIssn'])
        normedPubs.push(normedPub)
    }, { concurrency: 1 })
    return normedPubs
  }

  async getNormedAuthorsFromSourceMetadata(sourceMetadata): Promise<NormedAuthor[]> {
    // just return nothing for now as not in metadata
    return []
  }

  //returns a machine readable string version of this source
  getSourceName() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'Scopus'
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

  async getHarvestOperations(client: ApolloClient<NormalizedCacheObject>): Promise<HarvestOperation[]> {
    const dateHelper = DateHelper.createDateHelper()
    let harvestOperations: HarvestOperation[] = []
    const years = this.dsConfig.harvestYears
    await pMap(years, async (year) => {
      // const normedPersons: NormedPerson[] = await NormedPerson.getAllNormedPersonsByYear(year.valueOf(), client)
      const resultsDir = path.join(this.dsConfig.harvestDataDir, `${this.dsConfig.sourceName}_${year}_${moment().format('YYYYMMDDHHmmss')}/`)
      const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: [],
        harvestResultsDir: resultsDir,
        startDate: dateHelper.getDateObject(`${year}-01-01`),
        endDate: dateHelper.getDateObject(`${year}-12-31`)
      }
      harvestOperations.push(harvestOperation)
    }, { concurrency: 1 })
    return harvestOperations
  }
}