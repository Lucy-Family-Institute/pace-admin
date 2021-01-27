import { Harvester } from '../harvester'
import { ScopusDataSource } from '../scopusDataSource'
import { loadPublications} from '../../units/loadPublications'
import { loadPersons} from '../../units/loadPersons'
import { randomWait } from '../../units/randomWait'

import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let scopusHarvester: Harvester
let defaultNormedPerson: NormedPerson
let testPersons: NormedPerson[]
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
        'search_person_id': 'searchPersonId',
        'search_person_family_name': 'searchPersonFamilyName',
        'search_person_given_name_initial': 'searchPersonGivenNameInitial',
        'search_person_given_name': 'searchPersonGivenName',
        'search_person_start_date': 'searchPersonStartDate',
        'search_person_end_date': 'searchPersonEndDate',
        'search_person_source_ids_scopus_affiliation_id': 'searchPersonSourceIdsScopusAffiliationId',
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
    expectedNormedPublications = await loadPublications(expectedPubCSVPath, publicationColumnMap)
    // get map of 'lastname, first initial' to normed publications
    expectedNormedPubsByAuthor = _.groupBy(expectedNormedPublications, (normedPub: NormedPublication) => {
        return `${normedPub.searchPerson.familyName}, ${normedPub.searchPerson.givenNameInitial}`
    })

    // testPersons = await loadPersons(testPersonsFilePath, personPropMap)
    testPersons = [defaultNormedPerson]

    jest.setTimeout(20000)
})

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.harvest', async () => {
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
    const results = await scopusHarvester.harvest(testPersons, new Date('2019-01-01'))
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    //expect(results[0].normedPublications).toEqual(expect.arrayContaining(expectedHarvestSet.normedPublications))
    expect(expectedHarvestSet.normedPublications).toEqual(expect.arrayContaining(results[0].normedPublications))
    //expect(results[0].normedPublications[0]).toEqual(expectedHarvestSet.normedPublications[0])
})

//TODO write loadPublications test