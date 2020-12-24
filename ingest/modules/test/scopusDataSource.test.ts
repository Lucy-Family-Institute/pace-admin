import { ScopusDataSource } from '../scopusDataSource'
import dotenv from 'dotenv'

dotenv.config({
  path: '../../../.env'
})
    
// environment variables
process.env.NODE_ENV = 'development';

let ds: ScopusDataSource
let dsConfig: DataSourceConfig

beforeAll(async () => {
  dsConfig = {
    baseUrl: 'https://www-scopus-com.proxy.library.nd.edu',
    queryUrl: 'https://api.elsevier.com/content/search/scopus',
    apiKey: process.env.SCOPUS_API_KEY,
    sourceName: 'Scopus',
    pageSize: 25,
    affiliationId: '60021508'
  }
  ds = new ScopusDataSource(dsConfig)
})

test('testing fetch scopus query with REST call', async () => {
  expect.hasAssertions();
  const lastName = 'zhang'
  const firstName = 's'
  const scopusAffiliationId = '60021508'
  const authorQuery = "AUTHFIRST("+ firstName +") and AUTHLASTNAME("+ lastName+ ") and AF-ID(" + scopusAffiliationId + ")"
  const results = await ds.fetchScopusQuery(authorQuery, 2019, 1000, 0)
  console.log(`Fetch Query Results are: ${JSON.stringify(results, null, 2)}`)
})
  
// test('testing get publication from Scopus with no start or end date set', async () => {
//   expect.hasAssertions();

// })

// test('testing get publication from Scopus with start date set', async () => {
//   expect.hasAssertions();

//   const lastName = 'Aprahamian'
//   const firstName = 'Ani'
//   const results = await ds.getPublicationsByName(lastName, firstName, new Date('2017'))
//   console.log(`Results are: ${JSON.stringify(results, null, 2)}`)
// })