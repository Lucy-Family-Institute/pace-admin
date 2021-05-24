import { Harvester, HarvestOperation } from '../harvester'
import { CrossRefDataSource } from '../crossrefDataSource'
import DataSource from '../dataSource'
import NormedPublication from '../normedPublication'
import HarvestSet from '../HarvestSet'
import NormedPerson from '../normedPerson'
import { randomWait } from '../../units/randomWait'
import { getDateObject } from '../../units/dateRange'
import { escapeForRegEx } from '../../units/normalizer'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let crossrefHarvester: Harvester
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
    baseUrl: 'https://api.crossref.org',
    queryUrl: 'https://api.crossref.org/works',
    sourceName: 'CrossRef',
    pageSize: '5',  // page size must be a string for the request to work
    requestInterval: 10000
}

const crossrefDS: CrossRefDataSource = new CrossRefDataSource(dsConfig)

beforeAll(async () => {
    // const wosDS: DataSource = new WosDataSource(dsConfig)
    crossrefHarvester = new Harvester(crossrefDS)

    defaultNormedPerson = {
        id: 94,
        familyName: 'Zhang',
        givenNameInitial: 'S',
        givenName: 'Siyuan',
        startDate: getDateObject('2019-01-01'),
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

    // testAllPersons = _.chunk(await loadPersons(testPersonsFilePath, personPropMap), 4)[0]

    jest.setTimeout(1000000)
})

test('test CrossRef generate author query string with start and end date', () => {
    expect.hasAssertions()
    const person = testPersons[0]
    const query = crossrefDS.getAuthorQuery(person, getDateObject('2020-01-01'), getDateObject('2020-12-31'))
    expect(query).toEqual({
        'query.author': `${_.toLower(person.givenName)}+${_.toLower(person.familyName)}`,
        'query.affiliation': 'notre+dame',
        'filter': 'from-pub-date:2020-01-01,until-pub-date:2020-12-31'
    })
})

// test('test CrossRef harvester.fetchPublications by Author Name', async () => {
//     expect.hasAssertions()
//     const expectedHarvestSet: HarvestSet = {
//         sourceName: dsConfig.sourceName,
//         searchPerson: defaultNormedPerson,
//         query: JSON.stringify(crossrefDS.getAuthorQuery(defaultNormedPerson)),
//         sourcePublications: [],
//         normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
//         offset: 0,
//         pageSize: Number.parseInt(dsConfig.pageSize),
//         totalResults: 4
//     }
//     // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
//     const results = await crossrefDS.getPublicationsByAuthorName(defaultNormedPerson, {}, 0, getDateObject('2020-01-01'), getDateObject('2020-12-31'))
//     // as new publications may be added to available, just test that current set includes expected pubs
//     expect(results.sourceName).toEqual(expectedHarvestSet.sourceName)
//     expect(results.searchPerson).toEqual(expectedHarvestSet.searchPerson)
//     expect(results.query).toEqual(expectedHarvestSet.query)
//     expect(results.sourcePublications.length).toEqual(expectedHarvestSet.totalResults)
//     expect(results.normedPublications).toEqual(undefined)
//     expect(results.offset).toEqual(expectedHarvestSet.offset)
//     expect(results.pageSize).toEqual(expectedHarvestSet.pageSize)
//     expect(results.totalResults).toEqual(expectedHarvestSet.totalResults)
// })