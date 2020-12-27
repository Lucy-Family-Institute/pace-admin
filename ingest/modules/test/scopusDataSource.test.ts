import { ScopusDataSource } from '../scopusDataSource'
import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let ds: ScopusDataSource
let dsConfig: DataSourceConfig

beforeAll(async () => {

  const filePath =  '../.env'
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }

  dotenv.config({
    path: filePath
  })
        
  // environment variables
  process.env.NODE_ENV = 'development';

  dsConfig = {
    baseUrl: 'https://www-scopus-com.proxy.library.nd.edu',
    queryUrl: 'https://api.elsevier.com/content/search/scopus',
    apiKey: process.env.SCOPUS_API_KEY,
    sourceName: 'Scopus',
    pageSize: '25',
    affiliationId: '60021508'
  }
  ds = new ScopusDataSource(dsConfig)
})

// TODO convert to use input parameters and expected csv
test('testing fetch scopus query with REST call', async () => {
  expect.hasAssertions();
  const lastName = 'zhang'
  const firstName = 's'
  const scopusAffiliationId = '60021508'
  const authorQuery = "AUTHFIRST("+ firstName +") and AUTHLASTNAME("+ lastName+ ") and AF-ID(" + scopusAffiliationId + ")"
  const results = await ds.fetchScopusQuery(authorQuery, '2019', '25', 0)

  const expectedResultKeys = [
    "@_fa",
    "link",
    "prism:url",
    "dc:identifier",
    "eid",
    "dc:title",
    "dc:creator",
    "prism:publicationName",
    "prism:issn",
    "prism:eIssn",
    "prism:volume",
    "prism:issueIdentifier",
    "prism:pageRange",
    "prism:coverDate",
    "prism:coverDisplayDate",
    "prism:doi",
    "citedby-count",
    "affiliation",
    "prism:aggregationType",
    "subtype",
    "subtypeDescription",
    "source-id",
    "openaccess",
    "openaccessFlag"
  ]
  
  if (results && results['search-results']['opensearch:totalResults']){
    const totalResults = parseInt(results['search-results']['opensearch:totalResults'])
    console.log(`Author Search Result Total Results: ${totalResults}`)
    expect(totalResults).toBeGreaterThan(0)
    if (totalResults > 0 && results['search-results']['entry']){
      console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
      const resultKeys = _.keys(results['search-results']['entry'][0])
      expect(resultKeys).toEqual(expectedResultKeys)
    }
  }
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