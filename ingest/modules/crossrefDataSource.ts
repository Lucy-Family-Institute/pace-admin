import axios from 'axios'
import _ from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'

export class CrossRefDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
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
    const query = this.getAuthorQuery(person, startDate, endDate)

    let totalResults: Number
    let publications = []

    // need to make sure date string in correct format
    const results = await this.fetchCrossRefQuery(this.dsConfig.pageSize, offset, query['query.author'], query['query.affiliation'], query['filter'])
    // if (results && results['search-results']['opensearch:totalResults']){
    //     totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
    //     if (totalResults > 0 && results['search-results']['entry']){
    //         publications = results['search-results']['entry']
    //     }
    // } else {
    //   totalResults = 0
    // }
    console.log(`CrossRef results are: ${JSON.stringify(_.keys(results['message']), null, 2)}`)
    console.log(`CrossRef results facets are: ${JSON.stringify(results['message']['facets'], null, 2)}`)
    console.log(`CrossRef results total-results are: ${JSON.stringify(results['message']['total-results'], null, 2)}`)
    console.log(`CrossRef results items-per-page are: ${JSON.stringify(results['message']['items-per-page'], null, 2)}`)
    console.log(`CrossRef results query is: ${JSON.stringify(results['message']['query'], null, 2)}`)


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

  async fetchCrossRefQuery(pageSize, offset, queryAuthor, affiliation?, filter?) : Promise<any>{
    console.log(`Querying crossref offset: ${offset}, and query.author: ${queryAuthor} query.affiliation: ${affiliation} query.filter: ${filter}`)

    const response = await axios.get(this.dsConfig.queryUrl, {
      headers: {
      //   'X-ELS-APIKey' : this.dsConfig.apiKey,
      },
      // assumes query is a set of properties for params
      params: {
        'query.author': queryAuthor,
        'query.affiliation': affiliation,
        'filter': filter
      }
      //query
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
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'CrossRef'
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