interface DataSource {

  // return the query passed to scopus for searching for given author
  getAuthorQuery(person: NormedPerson) : string

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorName(person: NormedPerson, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet>
  
  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorId?(person: NormedPerson, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet>
  
  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): NormedPublication[]

  //returns a machine readable string version of this source
  getSourceName() : string

  // returns the page size set for API requests to the source
  getRequestPageSize(): Number

  // perform any actions necessary to initialize a connection to the datasource
  initialize()
}