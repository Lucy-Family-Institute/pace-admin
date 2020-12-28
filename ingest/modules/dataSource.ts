interface DataSource {
  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorName(person: NormedPerson, startDate?: Date, endDate?: Date) : Promise<[]>
  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: []): NormedPublication[]

  //returns a machine readable string version of this source
  getSourceName() : String

  // perform any actions necessary to initialize a connection to the datasource
  initialize()
}