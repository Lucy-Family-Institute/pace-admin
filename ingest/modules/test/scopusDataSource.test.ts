// import ScopusDataSource from '../scopusDataSource'

let ds: ScopusDataSource
let dsConfig: DataSourceConfig

beforeAll(async () => {
  dsConfig = new DataSourceConfig({
    SCOPUS_API_KEY: 'test',
    SCOPUS_API_COOKIE: 'test',
    SCOPUS_ARTICLE_URI_BASE: 'test'
  })
  ds = new ScopusDataSource(dsConfig)
})
  
  test('testing get publication author map from csl', async () => {
    expect.hasAssertions();
  
    // _.each(_.keys(pubCSLs), async (doi) => {
    //   const foundPubAuthorMap = await getPublicationAuthorMap(pubCSLs[doi])
    //   expect(pubAuthorMaps[doi]).toEqual(foundPubAuthorMap)
    // })
  })