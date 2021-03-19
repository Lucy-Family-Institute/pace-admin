import { Harvester, HarvestOperation } from '../harvester'
import { WosDataSource } from '../wosDataSource'
import NormedPublication from '../normedPublication'
import { loadPersons} from '../../units/loadPersons'
import { randomWait } from '../../units/randomWait'
import { getDateObject } from '../../units/dateRange'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let wosHarvester: Harvester
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

const dsConfig: DataSourceConfig = {
    baseUrl: 'http://search.webofknowledge.com/esti/wokmws/ws',
    queryUrl: 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite',
    userName: process.env.WOS_USERNAME,
    password: process.env.WOS_PASSWORD,
    sourceName: 'WebOfScience',
    pageSize: '25'  // page size must be a string for the request to work
}

const wosDS: WosDataSource = new WosDataSource(dsConfig)

beforeAll(async () => {
    // const wosDS: DataSource = new WosDataSource(dsConfig)
    wosHarvester = new Harvester(wosDS)

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
    // const expectedPubCSVPath = './test/fixtures/scopus.2019.csv'
    // expectedNormedPublications = await NormedPublication.loadFromCSV(expectedPubCSVPath)
    // get map of 'lastname, first initial' to normed publications
    expectedNormedPubsByAuthor = _.groupBy(expectedNormedPublications, (normedPub: NormedPublication) => {
        return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    })

    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    testPersons = [defaultNormedPerson]

    testAllPersons = _.chunk(await loadPersons(testPersonsFilePath, personPropMap), 4)[0]

    jest.setTimeout(1000000)
})

test('test Web of Science initialize', async () => {
    expect.hasAssertions()
    await wosDS.initialize()
    expect(wosDS.getSessionId()).toEqual('test')
})

// test('test Web of Science harvester.fetchPublications by Author Name', async () => {
//     expect.hasAssertions()
//     const expectedHarvestSet: HarvestSet = {
//         sourceName: dsConfig.sourceName,
//         searchPerson: defaultNormedPerson,
//         query: wosDS.getAuthorQuery(defaultNormedPerson),
//         sourcePublications: [],
//         normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
//         offset: 0,
//         pageSize: Number.parseInt(dsConfig.pageSize),
//         totalResults: 198
//     }
//     // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
//     const results = await wosHarvester.fetchPublications(defaultNormedPerson, HarvestOperation.QUERY_BY_AUTHOR_NAME, 0, getDateObject('2019-01-01'))
//     // as new publications may be added to available, just test that current set includes expected pubs
//     expect(results.sourceName).toEqual(expectedHarvestSet.sourceName)
//     expect(results.searchPerson).toEqual(expectedHarvestSet.searchPerson)
//     expect(results.query).toEqual(expectedHarvestSet.query)
//     expect(results.sourcePublications.length).toEqual(wosDS.getRequestPageSize())
//     expect(results.normedPublications).toEqual(expect.arrayContaining([expectedHarvestSet.normedPublications[0]]))
//     expect(results.offset).toEqual(expectedHarvestSet.offset)
//     expect(results.pageSize).toEqual(expectedHarvestSet.pageSize)
//     expect(results.totalResults).toEqual(expectedHarvestSet.totalResults)
// })