import axios from 'axios'
import _ from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import DataSourceConfig from './dataSourceConfig'
import { PossibleFragmentSpreadsRule } from 'graphql'

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
    if (results && results['message']['total-results']){
        totalResults = Number.parseInt(results['message']['total-results'])
        if (totalResults > 0 && results['message']['items']){
            publications = results['message']['items']
        }
    } else {
      totalResults = 0
    }
    // console.log(`CrossRef results are: ${JSON.stringify(results['message']['items'][0], null, 2)}`)
    // console.log(`CrossRef results are: ${JSON.stringify(_.keys(results['message']), null, 2)}`)
    // console.log(`CrossRef results facets are: ${JSON.stringify(results['message']['facets'], null, 2)}`)
    console.log(`CrossRef results total-results are: ${JSON.stringify(results['message']['total-results'], null, 2)}`)
    console.log(`CrossRef results items-per-page are: ${JSON.stringify(results['message']['items-per-page'], null, 2)}`)
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

  async fetchCrossRefQuery(pageSize, offset, queryAuthor, affiliation?, filter?) : Promise<any>{
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

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): NormedPublication[]{
    const normedPubs =  _.map(sourcePublications, (pub) => {
      let publicationDate = ''
      if (pub['issued'] && pub['issued']['date-parts'] && pub['issued']['date-parts'][0] && pub['issued']['date-parts'][0][0]) {
        const dateParts = pub['issued']['date-parts'][0]
        let first = true
        _.each (dateParts, (datePart) => {
          if (!first) {
            publicationDate = `${publicationDate}-`
          }
          publicationDate = `${publicationDate}${datePart}`
          first = false
        })
      }
      let normedPub: NormedPublication = {
          title: pub['title'][0],
          journalTitle: pub['container-title'] ? pub['container-title'][0] : (pub['short-container-title'] ? pub['short-containter-title'] : ''),
          publicationDate: publicationDate,
          datasourceName: this.dsConfig.sourceName,
          doi: pub['DOI'] ? pub['DOI'] : '',
          sourceId: pub['DOI'] ? pub['DOI'] : '',
          sourceMetadata: pub
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
      return normedPub
    })

    return _.filter(normedPubs, (pub) => {
      return (pub !== undefined && pub !== null)
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