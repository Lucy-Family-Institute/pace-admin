import { Harvester, HarvestOperation } from '../harvester'
import { ScopusDataSource } from '../scopusDataSource'
import NormedPublication from '../normedPublication'
import { loadPersons} from '../../units/loadPersons'
import { randomWait } from '../../units/randomWait'
import { getDateObject } from '../../units/dateRange'
import HarvestSet from '../harvestSet'
import DataSource from '../dataSource'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let scopusHarvester: Harvester
let defaultNormedPerson: NormedPerson
let testPersons: NormedPerson[]
let testAllPersons: NormedPerson[]
let expectedNormedPublications: NormedPublication[]
let expectedNormedPubsByAuthor

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
    pageSize: '25'  // page size must be a string for the request to work
}

const scopusDS: DataSource = new ScopusDataSource(scopusConfig)

beforeAll(async () => {
    const scopusDS: DataSource = new ScopusDataSource(scopusConfig)
    scopusHarvester = new Harvester(scopusDS)

    defaultNormedPerson = {
        id: 94,
        familyName: 'Zhang',
        givenNameInitial: 'S',
        givenName: 'Siyuan',
        startDate: getDateObject('2017-01-01'),
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

    const testPersonsFilePath = './test/fixtures/persons_sample_2019.csv'
    const expectedPubCSVPath = './test/fixtures/scopus.2019.csv'
    expectedNormedPublications = await NormedPublication.loadFromCSV(expectedPubCSVPath)
    // get map of 'lastname, first initial' to normed publications
    expectedNormedPubsByAuthor = _.groupBy(expectedNormedPublications, (normedPub: NormedPublication) => {
        return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    })

    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    testPersons = [defaultNormedPerson]

    testAllPersons = _.chunk(await loadPersons(testPersonsFilePath, personPropMap), 4)[0]

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
        normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(scopusConfig.pageSize),
        totalResults: 198
    }
    // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
    const results = await scopusHarvester.fetchPublications(defaultNormedPerson, HarvestOperation.QUERY_BY_AUTHOR_NAME, {}, 0, getDateObject('2019-01-01'), undefined)
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
        normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(scopusConfig.pageSize),
        totalResults: 198
    }

    let expectedHarvestSetArraySize = parseInt(`${expectedHarvestSet.totalResults.valueOf() / expectedHarvestSet.pageSize.valueOf()}`) //convert to an integer to drop any decimal
    if ((expectedHarvestSet.totalResults.valueOf() % expectedHarvestSet.pageSize.valueOf()) > 0) {
      expectedHarvestSetArraySize += 1
    }
    const results: HarvestSet[] = await scopusHarvester.harvest(testPersons, HarvestOperation.QUERY_BY_AUTHOR_NAME, getDateObject('2019-01-01'))
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    expect(results.length).toEqual(expectedHarvestSetArraySize) // checking the right number of harvest sets return (in chunks based on page size)
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
        const expectedPub = _.omit(expectedNormedPubsByDoi[doi], 'sourceMetadata')
        const receivedPub = _.omit(resultNormedPubsByDoi[doi], 'sourceMetadata')
       
        expect(expectedPub).toEqual(receivedPub)
        // finally just check that source metadata is defined
        expect(resultNormedPubsByDoi[doi]['sourceMetadata']).toBeDefined()
    })
})

test('test scopus harvester.harvestToCsv', async () => {
    await scopusHarvester.harvestToCsv(testPersons, HarvestOperation.QUERY_BY_AUTHOR_NAME, getDateObject('2019-01-01'))
})

// test('test scopus harvester.harvestToCsv with full author list', async () => {
//     // console.log(`Test persons is: ${JSON.stringify(testPersons, null, 2)}`)
//     // console.log(`Test persons is: ${JSON.stringify(testAllPersons, null, 2)}`)
//     expect.hasAssertions()
//     const csvFilePath = await scopusHarvester.harvestToCsv(testAllPersons, HarvestOperation.QUERY_BY_AUTHOR_NAME, getDateObject('2019-01-01'))
//     const harvestedPubs = await NormedPublication.loadFromCSV(csvFilePath)
//     const harvestedByAuthor = _.groupBy(harvestedPubs, (normedPub: NormedPublication) => {
//         return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
//     })
//     // check harvested same as expected
//     _.each(_.keys(harvestedByAuthor), (author) => {
//         const harvested = harvestedByAuthor[author]
//         const expected = expectedNormedPubsByAuthor[author]
//         const resultNormedPubsByDoi = _.mapKeys(harvested, (normedPub) => {
//             return normedPub['doi']
//         })
//         const expectedNormedPubsByDoi = _.mapKeys(expected, (expectedPub) => {
//             return expectedPub['doi']
//         })
//         _.each(_.keys(resultNormedPubsByDoi), (doi) => {
//             // ignore sourcemetadata since things like citedby-count often change over time
//             const expectedPub = _.omit(expectedNormedPubsByDoi[doi], 'sourceMetadata')
//             const receivedPub = _.omit(resultNormedPubsByDoi[doi], 'sourceMetadata')
//             expect(receivedPub).toEqual(expectedPub)
//         })
//     })
// })

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.harvest by author id throws error', async () => {
    // expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: scopusConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: scopusDS.getAuthorQuery(defaultNormedPerson),
        sourcePublications: [],
        normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(scopusConfig.pageSize),
        totalResults: 198
    }
    const results = await scopusHarvester.harvest(testPersons, HarvestOperation.QUERY_BY_AUTHOR_ID, getDateObject('2019-01-01'))
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    expect(results[0].errors).toEqual(['\'QUERY_BY_AUTHOR_ID\' not supported by datasource harvester Scopus'])
})