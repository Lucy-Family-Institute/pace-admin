import { Harvester, HarvestOperation } from '../harvester'
import { WosDataSource } from '../wosDataSource'
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
    pageSize: '5',  // page size must be a string for the request to work
    requestInterval: 10000
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

test('test Web of Science initialize', async () => {
    expect.hasAssertions()
    await wosDS.initialize()
    // change to look at substring prefix check of SID=xxxxxx
    expect(wosDS.getSessionId()).toMatch(/SID=[^]*/)
})

test('test Web of Science generate author query string', () => {
    expect.hasAssertions()
    const person = testPersons[0]
    const query = wosDS.getAuthorQuery(person)
    expect(query).toEqual(`AU = (${person.familyName}, ${person.givenName}) AND OG = (University of Notre Dame)`)
})

test('test Web of Science generate query soap string correctly sets end date if undefined', () => {
    expect.hasAssertions()
    const person = testPersons[0]
    const query = wosDS.getAuthorQuery(person)
    const startDateString = '2019-01-01'
    const soapString = wosDS.getWoSQuerySOAPString(query,getDateObject(startDateString), undefined)
    expect(soapString).toMatch(new RegExp(`[^]*<begin>${escapeForRegEx(startDateString)}<\/begin>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<end>${escapeForRegEx('2019-12-31')}<\/end>[^]*`))
   
})

test('test Web of Science generate query soap string', () => {
    expect.hasAssertions()
    const person = testPersons[0]
    const query = wosDS.getAuthorQuery(person)
    const startDateString = '2019-01-01'
    const endDateString = '2020-12-31'
    const soapString = wosDS.getWoSQuerySOAPString(query,getDateObject(startDateString), getDateObject(endDateString))
    expect(soapString).toMatch(new RegExp(`[^]*<soapenv:Envelope[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<soapenv:Header/>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<soapenv:Body>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<woksearchlite:search>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<queryParameters>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<databaseId>WOS<\/databaseId>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<editions>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<collection>WOS<\/collection>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<edition>SCI<\/edition>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<\/editions>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<timeSpan>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<userQuery>${escapeForRegEx(query)}<\/userQuery>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<begin>${escapeForRegEx(startDateString)}<\/begin>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<end>${escapeForRegEx(endDateString)}<\/end>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<\/timeSpan>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<queryLanguage>en</queryLanguage>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*</queryParameters>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<retrieveParameters>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<firstRecord>1</firstRecord>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<count>0</count>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*</retrieveParameters>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*</woksearchlite:search>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*</soapenv:Body>[^]*`))
    expect(soapString).toMatch(new RegExp(`[^]*<\/soapenv:Envelope[^]*`))
})

test('test Web of Science harvester.fetchPublications by Author Name', async () => {
    expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: dsConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: wosDS.getAuthorQuery(defaultNormedPerson),
        sourcePublications: [],
        normedPublications: expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(dsConfig.pageSize),
        totalResults: 4
    }
    // for date need to call getDateObject to make sure time zone is set correctly and not accidentally setting to previous date because of hour difference in local timezone
    const results = await wosDS.getPublicationsByAuthorName(defaultNormedPerson, {}, 0, getDateObject('2019-01-01'))
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