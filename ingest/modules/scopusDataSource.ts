import axios from 'axios'
import _ from 'lodash'

export class ScopusDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }
     // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, startDate: Date, endDate?: Date): Promise<[]> {
    let authorQuery = "AUTHFIRST("+ _.toLower(person.firstInitial) +") and AUTHLASTNAME("+ _.toLower(person.lastName) +")"
    if (person.sourceIds.scopusAffiliationId){
      authorQuery = authorQuery+" and AF-ID("+person.sourceIds.scopusAffiliationId+")" 
    } 

    // need to make sure date string in correct format
    const results = await this.fetchScopusQuery(authorQuery, startDate.getUTCFullYear().toString(), this.dsConfig.pageSize, 0)
    return results
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
  getNormedPublications(sourcePublications: []): NormedPublication[]{
      return []
  }

  //returns a machine readable string version of this source
  getSourceName() {
      return 'Scopus'
  }

  initialize() {

  }
}