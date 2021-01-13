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
        givenname: 'given_name',
        familyname: 'family_name',
        startdate: 'start_date',
        enddate: 'end_date'
    }

    const testPersonsFilePath = '../../test/fixtures/persons_2020.csv'
    const expectedPubCSVPath = '../../test/fixtures/scopus.2019.20210104110625.csv'
    expectedPublications = _.values(await loadPublications(expectedPubCSVPath))

    testPersons = await loadPersons(testPersonsFilePath, personPropMap)
})

//TODO load in list of people to test against expected results for 2019
test('test Scopus harvester.harvest', async () => {
    expect.hasAssertions()
    const results = await scopusHarvester.harvest(testPersons, new Date('2019-01-01'))
    // as new publications may be added to available, just test that current set includes expected pubs
    // and that total harvested is in the same power of 10 and less than double the expected amount
    console.log(`Found publications: ${results.foundPublications.length}`)
    expect(results['foundPublications']).toEqual(expect.arrayContaining(expectedPublications))
})

//TODO write loadPublications test