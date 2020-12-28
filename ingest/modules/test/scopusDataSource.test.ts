import { ScopusDataSource } from '../scopusDataSource'
import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let ds: ScopusDataSource
let dsConfig: DataSourceConfig
let defaultExpectedResultKeys = []
let defaultNormedPerson: NormedPerson
let defaultNormedPersonWAffiliation: NormedPerson
let defaultYear: string
let defaultTotalExpectedResults

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
    pageSize: '25'  // page size must be a string for the request to work
  }
  ds = new ScopusDataSource(dsConfig)

  // for now this is the set expected every time, not fully optimized yet
  defaultExpectedResultKeys = [
    "prism:url",
    "dc:identifier",
    "eid",
    "dc:title",
    "dc:creator",
    "prism:publicationName",
    "prism:volume",
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

  defaultNormedPerson = {
    id: 1,
    lastName: 'Zhang',
    firstInitial: 'S',
    firstName: 'Suyaun',
    startDate: new Date('2017-01-01'),
    endDate: undefined,
    sourceIds: {
      scopusAffiliationId: '60021508'
    }
  }

  defaultYear = '2019'

  defaultTotalExpectedResults = {
      withAffiliation: 198,
      woutAffilation: 77428
  }
})

// TOD fix overriding JEST timeout of 5000 ms that creeps up sometimes
// TODO convert to use input parameters and expected csv
test('testing fetch scopus query with REST call', async () => {
  expect.hasAssertions();
  const year = '2019'
  const authorQuery = "AUTHFIRST("+ _.toLower(defaultNormedPerson.firstInitial) +") and AUTHLASTNAME("+ _.toLower(defaultNormedPerson.lastName)+ ") and AF-ID(" + defaultNormedPerson.sourceIds.scopusAffiliationId + ")"
  const results = await ds.fetchScopusQuery(authorQuery, year, dsConfig.pageSize, 0)
  
  if (results && results['search-results']['opensearch:totalResults']){
    const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
    console.log(`Author Search Result Total Results: ${totalResults}`)
    expect(totalResults).toBeGreaterThan(0)
    expect(totalResults).toEqual(defaultTotalExpectedResults.withAffiliation)
    if (totalResults > 0 && results['search-results']['entry']){
      expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
      console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
      const resultKeys = _.keys(results['search-results']['entry'][0])
      // just check if a subset of keys are in the expected list
      expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))
    }
  }
})

// TODO: move dup code to shared method
test('testing get publication from Scopus with no affiliation id', async () => {
    expect.hasAssertions();

    const person: NormedPerson = _.cloneDeep(defaultNormedPerson)
    person.sourceIds = {}
    const results = await ds.getPublicationsByAuthorName(person, new Date(`${defaultYear}-01-01`))
    if (results && results['search-results']['opensearch:totalResults']){
        const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        console.log(`Author Search Result Total Results: ${totalResults}`)
        expect(totalResults).toBeGreaterThan(0)
        expect(totalResults).toEqual(defaultTotalExpectedResults.woutAffilation)
        if (totalResults > 0 && results['search-results']['entry']){
           expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
           console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
           const resultKeys = _.keys(results['search-results']['entry'][0])
           // just check if a subset of keys are in the expected list
           expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))       
        }
    }
})

test('testing get publication from Scopus with affiliation id', async () => {
    expect.hasAssertions();
    const results = await ds.getPublicationsByAuthorName(defaultNormedPerson, new Date(`${defaultYear}-01-01`))
    if (results && results['search-results']['opensearch:totalResults']){
        const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        console.log(`Author Search Result Total Results: ${totalResults}`)
        expect(totalResults).toBeGreaterThan(0)
        expect(totalResults).toEqual(defaultTotalExpectedResults.withAffiliation)
        if (totalResults > 0 && results['search-results']['entry']){
           expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
           console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
           const resultKeys = _.keys(results['search-results']['entry'][0])
           // just check if a subset of keys are in the expected list
           expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))
        }
    }
})