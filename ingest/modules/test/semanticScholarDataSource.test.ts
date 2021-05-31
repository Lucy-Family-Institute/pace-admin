import { Harvester, HarvestOperation } from '../harvester'
import { SemanticScholarDataSource } from '../semanticScholarDataSource'
import DataSource from '../dataSource'
import NormedPublication from '../normedPublication'
import HarvestSet from '../HarvestSet'
import NormedPerson from '../normedPerson'
import { randomWait } from '../../units/randomWait'
import { getDateObject } from '../../units/dateRange'
import { escapeForRegEx } from '../../units/normalizer'
import {loadJSONFromFile} from '../..//units/loadJSONFromFile'
import DataSourceConfig from '../dataSourceConfig'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let semanticScholarHarvester: Harvester
let defaultNormedPerson: NormedPerson
let testPersons: NormedPerson[]
let testAllPersons: NormedPerson[]
let expectedNormedPublications: NormedPublication[]
let defaultPubSourceMetadata
let expectedNormedPubsByAuthor
let defaultExpectedNormedPublication: NormedPublication


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
    baseUrl: 'https://api.semanticscholar.org/v1/',
    authorUrl: 'https://api.semanticscholar.org/v1/author/',
    queryUrl: 'https://api.semanticscholar.org/v1/',
    publicationUrl: 'https://api.semanticscholar.org/v1/paper/',
    sourceName: 'SemanticScholar',
    pageSize: '100',  // page size must be a string for the request to work
    requestInterval: 3500
}

// for now this is the set expected every time, not fully optimized yet
const defaultExpectedResultKeys = [
    "publisher",
    "container-title",
    "DOI",
    "type",
    "created",
    "source",
    "title",
    "volume",
    "author",
    "reference",
    "issued",
    "ISSN",
    "subject"
  ]

const crossrefSampleRecordPath = './test/fixtures/crossref_source_sample.json'

const semanticScholarDS: SemanticScholarDataSource = new SemanticScholarDataSource(dsConfig)

beforeAll(async () => {
    // const wosDS: DataSource = new WosDataSource(dsConfig)
    semanticScholarHarvester = new Harvester(semanticScholarDS)

    defaultPubSourceMetadata = loadJSONFromFile(crossrefSampleRecordPath)

    defaultNormedPerson = {
        id: 94,
        familyName: 'Li',
        givenNameInitial: 'JU',
        givenName: 'Jun',
        startDate: getDateObject('2019-01-01'),
        endDate: undefined,
        sourceIds: {
            semanticScholarId: '46276642'
        }
    }

    defaultExpectedNormedPublication = {
        searchPerson: defaultNormedPerson,
        title: 'A Bootstrap Procedure for Testing P-Technique Factor Analysis',
        journalTitle: 'Multivariate Behavioral Research',
        journalIssn: '0027-3171',
        journalEIssn: '1532-7906',
        doi: '10.1080/00273171.2020.1852908',
        publicationDate: '2020-12-2',
        datasourceName: dsConfig.sourceName,
        sourceId: '10.1080/00273171.2020.1852908',
        sourceMetadata: defaultPubSourceMetadata
      }


    // const personPropMap = {
    //     id: 'id',
    //     'given_name': 'givenName',
    //     'family_name': 'familyName',
    //     'start_date': 'startDate',
    //     'end_date': 'endDate'
    // }

    // const testPersonsFilePath = './test/fixtures/persons_sample_2019.csv'
    // // const expectedPubCSVPath = './test/fixtures/scopus.2019.csv'
    // // expectedNormedPublications = await NormedPublication.loadFromCSV(expectedPubCSVPath)
    // // get map of 'lastname, first initial' to normed publications
    // expectedNormedPubsByAuthor = _.groupBy(expectedNormedPublications, (normedPub: NormedPublication) => {
    //     return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    // })

    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    testPersons = [defaultNormedPerson]

    // testAllPersons = _.chunk(await loadPersons(testPersonsFilePath, personPropMap), 4)[0]

    jest.setTimeout(1000000)
})

// test('test CrossRef generate author query string with start and end date', () => {
//     expect.hasAssertions()
//     const person = testPersons[0]
//     const query = crossrefDS.getAuthorQuery(person, getDateObject('2020-01-01'), getDateObject('2020-12-31'))
//     expect(query).toEqual({
//         'query.author': `${_.toLower(person.givenName)}+${_.toLower(person.familyName)}`,
//         'query.affiliation': 'notre+dame',
//         'filter': 'from-pub-date:2020-01-01,until-pub-date:2020-12-31'
//     })
// })

test('test Semantic Scholar harvester.fetchPublications by Author Name', async () => {
    expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: dsConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: JSON.stringify(semanticScholarDS.getAuthorQuery(defaultNormedPerson, getDateObject('2020-01-01'), getDateObject('2020-12-31'))),
        sourcePublications: [],
        normedPublications: undefined, // expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(dsConfig.pageSize),
        totalResults: 54
    }
    // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
    const results = await semanticScholarDS.getPublicationsByAuthorId(defaultNormedPerson, {}, 0, getDateObject('2020-01-01'), getDateObject('2020-12-31'))
})

test('test Semantic Scholar harvester.fetchPublications by Author Name', async () => {
    expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: dsConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: JSON.stringify(semanticScholarDS.getAuthorQuery(defaultNormedPerson, getDateObject('2020-01-01'), getDateObject('2020-12-31'))),
        sourcePublications: [],
        normedPublications: undefined, // expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(dsConfig.pageSize),
        totalResults: 32
    }
    // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
    const results = await semanticScholarDS.getPublicationsByAuthorId(defaultNormedPerson, {}, 0, getDateObject('2020-01-01'), getDateObject('2020-12-31'))
    // as new publications may be added to available, just test that current set includes expected pubs
    expect(results.sourceName).toEqual(expectedHarvestSet.sourceName)
    expect(results.searchPerson).toEqual(expectedHarvestSet.searchPerson)
    expect(results.query).toEqual(expectedHarvestSet.query)
    expect(results.sourcePublications.length).toEqual(expectedHarvestSet.totalResults)
    expect(results.normedPublications).toEqual(undefined)
    expect(results.offset).toEqual(expectedHarvestSet.offset)
    expect(results.pageSize).toEqual(expectedHarvestSet.pageSize)
    expect(results.totalResults).toEqual(expectedHarvestSet.totalResults)
})

// test('test CrossRef crossrefSource.getNormedPublications', () => {
//     expect.hasAssertions()
//     const testPubs = [ defaultPubSourceMetadata ]
//     const normedPubResults = crossrefDS.getNormedPublications(testPubs, defaultNormedPerson)
//     // expect(normedPubResults.length).toEqual(1)
//     // as the source metadata can vary only check the other values and that source metadata is not null
//     _.each(_.keys(normedPubResults[0]), (key) => {
//         if (key === 'source_metadata') {
//           expect(normedPubResults[0][key]).toBeDefined
//         } else {
//           expect(normedPubResults[0][key]).toEqual(defaultExpectedNormedPublication[key])
//         }
//     })
// })