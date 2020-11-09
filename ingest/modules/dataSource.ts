interface DataSource {
  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  getPublicationsByName(lastName: String, firstName: String, startDate?: Date, endDate?: Date) : Promise<[]>
  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: []): NormedPublication[]
}