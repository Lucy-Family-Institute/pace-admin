import axios from 'axios'
import _ from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'

export class ScopusDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
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
    const results = await this.fetchScopusQuery(authorQuery, dateFilter, this.dsConfig.pageSize, offset)
    if (results && results['search-results']['opensearch:totalResults']){
        totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        if (totalResults > 0 && results['search-results']['entry']){
            publications = results['search-results']['entry']
        }
    } else {
      totalResults = 0
    }
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

  async fetchScopusQuery(query, date, pageSize, offset) : Promise<any>{
    console.log(`Querying scopus with date: ${date}, offset: ${offset}, and query: ${query}`)

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
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): NormedPublication[]{
    return _.map(sourcePublications, (pub) => {
        let normedPub: NormedPublication = {
            title: pub['dc:title'],
            journalTitle: pub['prism:publicationName'],
            publicationDate: pub['prism:coverDate'],
            datasourceName: this.dsConfig.sourceName,
            doi: pub['prism:doi'] ? pub['prism:doi'] : '',
            sourceId: _.replace(pub['dc:identifier'], 'SCOPUS_ID:', ''),
            sourceMetadata: pub
        }
        // add optional properties
        if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
        if (pub['abstract']) _.set(normedPub, 'abstract', pub['abstract'])
        if (pub['prism:issn']) _.set(normedPub, 'journalIssn', pub['prism:issn'])
        if (pub['prism:eIssn']) _.set(normedPub, 'journalEIssn', pub['prism:eIssn'])
        return normedPub
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'Scopus'
  }

  getRequestPageSize(): Number {
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {

  }

  getDataSourceConfig() {
    return this.dsConfig
  }
  
}