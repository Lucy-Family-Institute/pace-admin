import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import HarvestSet from './HarvestSet'
import DataSourceConfig from './dataSourceConfig'
export default interface DataSource {

  // return the query passed to scopus for searching for given author
  getAuthorQuery(person: NormedPerson, startDate?: Date, endDate?: Date)

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet>
  
  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorId?(person: NormedPerson, sessionState: {}, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet>
  
  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>

  //returns a machine readable string version of this source
  getSourceName() : string

  // returns the page size set for API requests to the source
  getRequestPageSize(): Number

  // perform any actions necessary to initialize a connection to the datasource
  initialize(): Promise<void>

  getDataSourceConfig(): DataSourceConfig
}