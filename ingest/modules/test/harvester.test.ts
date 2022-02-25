import Harvester from '../harvester'
import { ScopusDataSource } from '../scopusDataSource'
import {CrossRefDataSource } from '../crossrefDataSource'
import NormedPublication from '../normedPublication'
import { randomWait } from '../../units/randomWait'
import DateHelper from '../../units/dateHelper'
import { HarvestOperationType, HarvestOperation } from '../harvestOperation'
import HarvestSet from '../harvestSet'
import DataSource from '../dataSource'
import NormedPerson from '../normedPerson'
import DataSourceConfig from '../dataSourceConfig'
import ApolloClient from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'
import { WosDataSource } from '../wosDataSource'

let scopusHarvester: Harvester
let wosHarvester: Harvester
let crossrefHarvester: Harvester
let defaultNormedPerson: NormedPerson
let testPersons: NormedPerson[]
let testWoSPersons: NormedPerson[]
let testAllPersons: NormedPerson[]
let expectedScopusNormedPublications: NormedPublication[]
let expectedScopusNormedPubsByAuthor
let expectedWosNormedPublications: NormedPublication[]
let expectedWosNormedPubsByAuthor

const filePath =  '../.env'
if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
}

dotenv.config({
    path: filePath
})    

  
// environment variables
process.env.NODE_ENV = 'development';

const scopusConfig: DataSourceConfig = {
    baseUrl: 'https://www-scopus-com.proxy.library.nd.edu',
    queryUrl: 'https://api.elsevier.com/content/search/scopus',
    apiKey: process.env.SCOPUS_API_KEY,
    sourceName: 'Scopus',
    pageSize: '25',  // page size must be a string for the request to work
    requestInterval: 1000,
    harvestDataDir: '../data/test',
    harvestFileBatchSize: 100,
    batchSize: 200
}

const wosConfig: DataSourceConfig = {
    baseUrl: 'http://search.webofknowledge.com/esti/wokmws/ws',
    queryUrl: 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite',
    userName: process.env.WOS_USERNAME,
    password: process.env.WOS_PASSWORD,
    sourceName: 'WebOfScience',
    pageSize: '5',  // page size must be a string for the request to work
    requestInterval: 10000, // number milliseconds to wait between requests
    harvestDataDir: '../data/test',
    harvestFileBatchSize: 100,
    batchSize: 200
}

const crossrefConfig: DataSourceConfig = {
    baseUrl: 'https://api.crossref.org',
    queryUrl: 'https://api.crossref.org/works',
    sourceName: 'CrossRef',
    pageSize: '5',  // page size must be a string for the request to work
    requestInterval: 10000,
    harvestFileBatchSize: 100,
    harvestDataDir: '../data/test',
    batchSize: 200
}

const scopusDS: DataSource = new ScopusDataSource(scopusConfig)
const wosDS: DataSource = new WosDataSource(wosConfig)
const crossrefDS: DataSource = new CrossRefDataSource(crossrefConfig)

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

beforeAll(async () => {
    scopusHarvester = new Harvester(scopusDS, client)
    wosHarvester = new Harvester(wosDS, client)
    crossrefHarvester = new Harvester(crossrefDS, client)

    defaultNormedPerson = {
        id: 94,
        familyName: 'Zhang',
        givenNameInitial: 'S',
        givenName: 'Siyuan',
        startDate: DateHelper.getDateObject('2017-01-01'),
        endDate: undefined,
        sourceIds: {
            scopusAffiliationId: '60021508'
        }
    }

    const personPropMap = {
        id: 'id',
        'given_name': 'givenName',
        'family_name': 'familyName',
        'start_date': 'startDate',
        'end_date': 'endDate'
    }

    const testPersonsFilePath = './test/fixtures/persons_2020.csv'
    const expectedScopusPubCSVPath = './test/fixtures/scopus.2019.csv'
    expectedScopusNormedPublications = await NormedPublication.loadFromCSV(expectedScopusPubCSVPath, scopusConfig.harvestDataDir)

    // get map of 'lastname, first initial' to normed publications
    expectedScopusNormedPubsByAuthor = _.groupBy(expectedScopusNormedPublications, (normedPub: NormedPublication) => {
        return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    })

    const expectedWosPubCSVPath = './test/fixtures/wos.2020.csv'
    expectedWosNormedPublications = await NormedPublication.loadFromCSV(expectedWosPubCSVPath, wosConfig.harvestDataDir)
    // get map of 'lastname, first initial' to normed publications
    expectedWosNormedPubsByAuthor = _.groupBy(expectedWosNormedPublications, (normedPub: NormedPublication) => {
        return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    })

    testAllPersons = await NormedPerson.loadFromCSV(testPersonsFilePath)
    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    // testPersons = [defaultNormedPerson]

    testPersons = _.chunk(testAllPersons, 2)[0]

    testWoSPersons = []
    _.each(testPersons, (person) => {
        testWoSPersons.push(_.set(person, 'sourceIds', {}))
    })

    console.log(`Test persons are: ${JSON.stringify(testPersons, null, 2)}`)

    jest.setTimeout(1000000)
})

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.fetchPublications by Author Name', async () => {
    expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: scopusConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: scopusDS.getAuthorQuery(defaultNormedPerson),
        sourcePublications: [],
        normedPublications: expectedScopusNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(scopusConfig.pageSize),
        totalResults: expectedScopusNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`].length
    }

    const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: [defaultNormedPerson],
        harvestResultsDir: scopusConfig.harvestDataDir,
        startDate: DateHelper.getDateObject('2019-01-01'),
        endDate: undefined
    }
    // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
    const results = await scopusHarvester.fetchPublications(defaultNormedPerson, harvestOperation, {}, 0)
    // as new publications may be added to available, just test that current set includes expected pubs
    expect(results.sourceName).toEqual(expectedHarvestSet.sourceName)
    expect(results.searchPerson).toEqual(expectedHarvestSet.searchPerson)
    expect(results.query).toEqual(expectedHarvestSet.query)
    expect(results.sourcePublications.length).toEqual(scopusDS.getRequestPageSize())
    expect(results.normedPublications).toEqual(expect.arrayContaining([expectedHarvestSet.normedPublications[0]]))
    expect(results.offset).toEqual(expectedHarvestSet.offset)
    expect(results.pageSize).toEqual(expectedHarvestSet.pageSize)
    expect(results.totalResults).toEqual(expectedHarvestSet.totalResults)
})

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.harvest by author name', async () => {
    // expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: scopusConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: scopusDS.getAuthorQuery(defaultNormedPerson),
        sourcePublications: [],
        normedPublications: expectedScopusNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(scopusConfig.pageSize),
        totalResults: 198
    }

    let expectedHarvestSetArraySize = parseInt(`${expectedHarvestSet.totalResults.valueOf() / expectedHarvestSet.pageSize.valueOf()}`) //convert to an integer to drop any decimal
    if ((expectedHarvestSet.totalResults.valueOf() % expectedHarvestSet.pageSize.valueOf()) > 0) {
      expectedHarvestSetArraySize += 1
    }
    const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: [defaultNormedPerson],
        harvestResultsDir: scopusConfig.harvestDataDir,
        startDate: DateHelper.getDateObject('2019-01-01'),
        endDate: undefined
    }
    const results: HarvestSet[] = await scopusHarvester.harvest([defaultNormedPerson], harvestOperation)
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    // expect(results.length).toEqual(expectedHarvestSetArraySize) // checking the right number of harvest sets return (in chunks based on page size)
    // combine values
    const combinedNormedPubs = _.mapValues(results, (result:HarvestSet) => {
        return result.normedPublications
    })
    
    let resultNormedPubs = []
    _.each(combinedNormedPubs, (pubs, index) => {
        resultNormedPubs = _.concat(resultNormedPubs, pubs)
    })
    const resultNormedPubsByDoi = _.mapKeys(resultNormedPubs, (normedPub) => {
        return normedPub['doi']
    })
    const expectedNormedPubsByDoi = _.mapKeys(expectedHarvestSet.normedPublications, (expectedPub) => {
        return expectedPub['doi']
    })
    expect(resultNormedPubs.length).toBeGreaterThanOrEqual(expectedHarvestSet.totalResults.valueOf())
    // check for each expected pub

    _.each(_.keys(expectedNormedPubsByDoi), (doi) => {

         // ignore sourcemetadata since things like citedby-count often change over time
         // also igmore sourceIds as those vary across sources
        const expectedPub = _.omit(expectedNormedPubsByDoi[doi], ['sourceMetadata', 'sourceIds'])
        const receivedPub = _.omit(resultNormedPubsByDoi[doi], ['sourceMetadata', 'sourceIds'])
       
        expect(receivedPub).toEqual(expectedPub)
        // finally just check that source metadata is defined
        expect(resultNormedPubsByDoi[doi]['sourceMetadata']).toBeDefined()
    })
})

//-------------Web of Science Tests

//TODO load in list of people to test against expected results for 2019
test('test Web of Science harvester.harvest by author name', async () => {
    const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: testWoSPersons,
        harvestResultsDir: wosConfig.harvestDataDir,
        startDate: DateHelper.getDateObject('2020-01-01'),
        endDate: undefined
    }

    const results: HarvestSet[] = await wosHarvester.harvest(testWoSPersons, harvestOperation)

    const resultsByPerson = _.groupBy(results, (harvestSet) => {
        const person = harvestSet.searchPerson
        return `${person.familyName}, ${person.givenNameInitial}`
    })

    const pageSize = Number.parseInt(wosConfig.pageSize)

    _.each(_.keys(resultsByPerson), (personKey) => {
        const personHarvestSets = resultsByPerson[personKey]
        let expectedNormedPubs = expectedWosNormedPubsByAuthor[personKey]
        if (!expectedNormedPubs) {
            expectedNormedPubs = []
        }
        let expectedHarvestSetArraySize = parseInt(`${expectedNormedPubs.length / pageSize }`) //convert to an integer to drop any decimal
        if (expectedNormedPubs.length % pageSize > 0) {
            expectedHarvestSetArraySize += 1
        }
    
        // as new publications may be added to available, just test that current set includes expected pubs
        // and that total harvested is in the same power of 10 and less than double the expected amount
       
        // combine values
        const normedPubs = _.mapValues(results, (result:HarvestSet) => {
            return result.normedPublications
        })
        
        let resultNormedPubs = []
        _.each(personHarvestSets, (harvestSet, index) => {
            resultNormedPubs = _.concat(resultNormedPubs, harvestSet.normedPublications)
        })
        const resultNormedPubsByDoi = _.mapKeys(resultNormedPubs, (normedPub) => {
            return normedPub['doi']
        })
        const expectedNormedPubsByDoi = _.mapKeys(expectedNormedPubs, (expectedPub) => {
            return expectedPub['doi']
        })
        expect(resultNormedPubs.length).toBeGreaterThanOrEqual(expectedNormedPubs.length)
        // check for each expected pub

        _.each(_.keys(expectedNormedPubsByDoi), (doi) => {

            // ignore sourcemetadata since things like citedby-count often change over time
            const expectedPub = _.omit(expectedNormedPubsByDoi[doi], 'sourceMetadata')
            const receivedPub = _.omit(resultNormedPubsByDoi[doi], 'sourceMetadata')
        

            expect(receivedPub).toEqual(expectedPub)
            // finally just check that source metadata is defined
            expect(resultNormedPubsByDoi[doi]['sourceMetadata']).toBeDefined()
        })
    })
})

//-------------CrossRef Tests

//TODO load in list of people to test against expected results for 2019
test('test CrossRef harvester.harvest by author name', async () => {

    const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: testPersons,
        harvestResultsDir: crossrefConfig.harvestDataDir,
        startDate: DateHelper.getDateObject('2020-01-01'),
        endDate: DateHelper.getDateObject('2020-12-31')
    }
    const results: HarvestSet[] = await crossrefHarvester.harvest(testPersons, harvestOperation)

    const resultsByPerson = _.groupBy(results, (harvestSet) => {
        const person = harvestSet.searchPerson
        return `${person.familyName}, ${person.givenNameInitial}`
    })

    const pageSize = Number.parseInt(crossrefConfig.pageSize)

    _.each(_.keys(resultsByPerson), (personKey) => {
        const personHarvestSets = resultsByPerson[personKey]
        let expectedNormedPubs = undefined // expectedCrossRefNormedPubsByAuthor[personKey]
        if (!expectedNormedPubs) {
            expectedNormedPubs = []
        }
        let expectedHarvestSetArraySize = parseInt(`${expectedNormedPubs.length / pageSize }`) //convert to an integer to drop any decimal
        if (expectedNormedPubs.length % pageSize > 0) {
            expectedHarvestSetArraySize += 1
        }
    
        // as new publications may be added to available, just test that current set includes expected pubs
        // and that total harvested is in the same power of 10 and less than double the expected amount
       
        // combine values
        const normedPubs = _.mapValues(results, (result:HarvestSet) => {
            return result.normedPublications
        })
        
        let resultNormedPubs = []
        _.each(personHarvestSets, (harvestSet, index) => {
            resultNormedPubs = _.concat(resultNormedPubs, harvestSet.normedPublications)
        })
        const resultNormedPubsByDoi = _.mapKeys(resultNormedPubs, (normedPub) => {
            return normedPub['doi']
        })
        const expectedNormedPubsByDoi = _.mapKeys(expectedNormedPubs, (expectedPub) => {
            return expectedPub['doi']
        })
        expect(resultNormedPubs.length).toBeGreaterThanOrEqual(expectedNormedPubs.length)
        // check for each expected pub

        _.each(_.keys(expectedNormedPubsByDoi), (doi) => {

            // ignore sourcemetadata since things like citedby-count often change over time
            const expectedPub = _.omit(expectedNormedPubsByDoi[doi], 'sourceMetadata')
            const receivedPub = _.omit(resultNormedPubsByDoi[doi], 'sourceMetadata')
        

            expect(receivedPub).toEqual(expectedPub)
            // finally just check that source metadata is defined
            expect(resultNormedPubsByDoi[doi]['sourceMetadata']).toBeDefined()
        })
    })
})

test('test CrossRef harvester.harvestToCsv', async () => {
    const harvestOperation: HarvestOperation = {
        harvestOperationType: HarvestOperationType.QUERY_BY_AUTHOR_NAME,
        normedPersons: testPersons,
        harvestResultsDir: crossrefConfig.harvestDataDir,
        startDate: DateHelper.getDateObject('2020-01-01'),
        endDate: DateHelper.getDateObject('2020-12-31')
    }
    await crossrefHarvester.harvestToCsv(harvestOperation, testPersons)
})
