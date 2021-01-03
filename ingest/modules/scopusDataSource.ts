import axios from 'axios'
import _ from 'lodash'

export class ScopusDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }
     // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, offset: Number, startDate: Date, endDate?: Date): Promise<NormedHarvestSet> {
    let authorQuery = "AUTHFIRST("+ _.toLower(person.firstInitial) +") and AUTHLASTNAME("+ _.toLower(person.lastName) +")"
    if (person.sourceIds.scopusAffiliationId){
      authorQuery = authorQuery+" and AF-ID("+person.sourceIds.scopusAffiliationId+")" 
    } 

    let totalResults: Number
    let publications = []

    // need to make sure date string in correct format
    const results = await this.fetchScopusQuery(authorQuery, startDate.getUTCFullYear().toString(), this.dsConfig.pageSize, offset)
    if (results && results['search-results']['opensearch:totalResults']){
        totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        if (totalResults > 0 && results['search-results']['entry']){
            publications = results['search-results']['entry']
        }
    } else {
        totalResults = 0
    }
    const normedResult: NormedHarvestSet = {
        sourceName: this.getSourceName(),
        publications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: totalResults
    }
    return normedResult
  }

  async fetchScopusQuery(query, date, pageSize, offset){
    console.log(`dsConfig is :${JSON.stringify(this.dsConfig, null, 2)}`)

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
        return {
            search_person: searchPerson,
            title: pub['dc:title'],
            journalTitle: pub['prism:publicationName'],
            journalIssn: pub['prism:issn'] ? pub['prism:issn'] : undefined,
            journalEIssn: pub['prism:eIssn'] ? pub['prism:eIssn'] : undefined,
            publicationDate: pub['prism:coverDate'],
            datasource_name: this.dsConfig.sourceName,
            doi: pub['prism:doi'] ? pub['prism:doi'] : '',
            source_id: _.replace(pub['dc:identifier'], 'SCOPUS_ID:', ''),
            source_metadata : pub
        }
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    return 'Scopus'
  }

  initialize() {

  }
  
}