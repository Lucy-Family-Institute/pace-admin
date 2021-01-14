import { Harvester } from '../harvester'
import { ScopusDataSource } from '../scopusDataSource'
import { loadPublications} from '../../units/loadPublications'
import { loadPersons} from '../../units/loadPersons'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let scopusHarvester: Harvester
let defaultNormedPerson: NormedPerson
let testPersons: NormedPerson[]
let expectedPublications: any[]

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

    const scopusConfig: DataSourceConfig = {
        baseUrl: 'https://www-scopus-com.proxy.library.nd.edu',
        queryUrl: 'https://api.elsevier.com/content/search/scopus',
        apiKey: process.env.SCOPUS_API_KEY,
        sourceName: 'Scopus',
        pageSize: '25'  // page size must be a string for the request to work
    }
    const scopusDS: DataSource = new ScopusDataSource(scopusConfig)
    scopusHarvester = new Harvester(scopusDS)

    defaultNormedPerson = {
        id: 1,
        familyName: 'Zhang',
        givenNameInitial: 'S',
        givenName: 'Suyaun',
        startDate: new Date('2017-01-01'),
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

    const publicationColumnMap = {
        // 'search_person': 'searchPerson': NormedPerson,
        title: 'title',
        'journal': 'journalTitle',
        doi: 'doi',
        'publication_date': 'publicationDate',
        'source_name': 'datasourceName',
        'source_id': 'sourceId',
        'source_metadata': 'sourceMetadata',
        'journal_issn': 'journalIssn',
        'journal_eissn': 'journalEIssn'
    }

    const testPersonsFilePath = './test/fixtures/persons_2020.csv'
    const expectedPubCSVPath = './test/fixtures/scopus.2019.csv'
    expectedPublications = _.values(await loadPublications(expectedPubCSVPath, publicationColumnMap))

    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    testPersons = [defaultNormedPerson]

    jest.setTimeout(10000)
})

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.harvest', async () => {
    expect.hasAssertions()
    const results: HarvestSet[] = await scopusHarvester.harvest(testPersons, new Date('2019-01-01'))
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    // console.log(`Found publications: ${results[0].normedPublications.length}`)
    expect(results[0].normedPublications).toEqual(expect.arrayContaining([expectedPublications[0]]))
})

//TODO write loadPublications test