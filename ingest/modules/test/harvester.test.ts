import { Harvester } from '../harvester'
import { ScopusDataSource } from '../scopusDataSource'
import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let scopusHarvester: Harvester
let defaultNormedPerson: NormedPerson

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
        lastName: 'Zhang',
        firstInitial: 'S',
        firstName: 'Suyaun',
        startDate: new Date('2017-01-01'),
        endDate: undefined,
        sourceIds: {
            scopusAffiliationId: '60021508'
        }
    }
    
})

test('test Scopus harvester.harvest', async () => {
    expect.hasAssertions()
    const results = await scopusHarvester.harvest([defaultNormedPerson], new Date('2019-01-01'))
    console.log(`Found publications: ${results.foundPublications.length}`)
})