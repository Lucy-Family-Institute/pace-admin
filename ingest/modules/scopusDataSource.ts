class ScopusDataSource implements DataSource {

  dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }
     // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByName(lastName: String, firstName: String, startDate?: Date, endDate?: Date): Promise<[]> {
      return []
  }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: []): NormedPublication[]{
      return []
  }

  //returns a machine readable string version of this source
  getSourceName() {
      return 'Scopus'
  }
}