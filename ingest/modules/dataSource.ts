interface DataSource {
  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByAuthorName(person: NormedPerson, offset: Number, startDate?: Date, endDate?: Date) : Promise<NormedHarvestSet>
  
  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[]): NormedPublication[]

  //returns a machine readable string version of this source
  getSourceName() : string

  // perform any actions necessary to initialize a connection to the datasource
  initialize()
}