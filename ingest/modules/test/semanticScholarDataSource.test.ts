import { Harvester, HarvestOperation } from '../harvester'
import { SemanticScholarDataSource } from '../semanticScholarDataSource'
import DataSource from '../dataSource'
import NormedPublication from '../normedPublication'
import HarvestSet from '../HarvestSet'
import NormedPerson from '../normedPerson'
import { randomWait } from '../../units/randomWait'
import { getDateObject } from '../../units/dateRange'
import Normalizer from '../../units/normalizer'
import FsHelper from '../../units/fsHelper'
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

const expectedCoAuthors = [
    {
        'authorId': '2004650058',
        'name': 'Yifan Liu',
        'url': 'https://www.semanticscholar.org/author/2004650058',
    },
    {
        'authorId': '47362470',
        'name': 'Q. Liu',
        'url': 'https://www.semanticscholar.org/author/47362470',
    },
    {
        'authorId': '1892177',
        'name': 'Shihong Xu',
        'url': 'https://www.semanticscholar.org/author/1892177',
    },
    {
        'authorId': null,
        'name': 'Yanfeng Wang',
        'url': null,
    },
    {
        'authorId': '40530954',
        'name': 'C. Feng',
        'url': 'https://www.semanticscholar.org/author/40530954',
    },
    {
        'authorId': '48504726',
        'name': 'Chunyan Zhao',
        'url': 'https://www.semanticscholar.org/author/48504726',
    },
    {
        'authorId': '91001132',
        'name': 'Z. Song',
        'url': 'https://www.semanticscholar.org/author/91001132',
    },
    {
        'authorId': '46276642',
        'name': 'Junbing Li',
        'url': 'https://www.semanticscholar.org/author/46276642',
    }
]

const sampleRecordPath = './test/fixtures/semanticscholar_source_sample.json'

const semanticScholarDS: SemanticScholarDataSource = new SemanticScholarDataSource(dsConfig)

beforeAll(async () => {
    semanticScholarHarvester = new Harvester(semanticScholarDS)

    defaultPubSourceMetadata = FsHelper.loadJSONFromFile(sampleRecordPath)

    defaultNormedPerson = {
        id: 94,
        familyName: 'Li',
        givenNameInitial: 'J',
        givenName: 'Jun',
        startDate: getDateObject('2019-01-01'),
        sourceIds: {
            semanticScholarIds: ['46276642']
        },
        endDate: undefined
    }

    defaultExpectedNormedPublication = {
        searchPerson: defaultNormedPerson,
        title: 'A Deep Insight of Spermatogenesis and Hormone Levels of Aqua-Cultured Turbot (Scophthalmus maximus)',
        journalTitle: 'Frontiers in Marine Science',
        doi: '10.3389/fmars.2020.592880',
        publicationDate: '2020',
        datasourceName: dsConfig.sourceName,
        sourceId: '28036d3e027f650fde7795021f2621719c7ad1b2',
        abstract: 'Turbot (Scophthalmus maximus) is an important marine fish both in Europe and North China. Although there are plenty of studies on the reproduction of turbot, the complete cytological process of spermatogenesis remains unclear. In this study, we investigated the submicroscopic structure of total 23 types of male germ cells throughout the breeding season, with a relatively complete process of the primary spermatocytes. We found that the spermatid tail formed early at Spermatid II, and there were at least 16 spherical mitochondria in the spermatozoa. The hepatosomatic index (HSI) and gonadosomatic index (GSI) both peaked during the breeding season. Preliminary analysis showed that the vitality of mature sperm was negatively correlated with the proportion of sperm deformity. The serum 3,5,3′-triiodothyronine (T3), 5-hydroxytryptamine (5-HT), testosterone (T), 17α,20β-Dihydroxy-4-pregnen-3-one (17α,20β-DHP), and 17β-estradiol (E2) all increased during the maturity period, with the change of T content most noticeable. Whereas in the testis, an overall high level of 11-ketotestosterone (11-KT) was more remarkable. The expression and localization of androgen receptor (AR) mRNA showed that the AR was highly expressed at the stages of II (15 – 70 g), with a slight rebound at the mature stages [IV(2200 g) to V(2500 g)], whose change was ahead to the changes of T and 11-KT. Fluorescence in situ hybridization (FISH) analysis showed that the AR mainly distributed in but not limited to Sertoli cells. This study represents the most complete overview of the reproductive cycle and spermatogenesis of turbot, which provides an important reference for the reproduction research and the guidance of flatfish breeding.',
        sourceMetadata: defaultPubSourceMetadata
      }

    testPersons = [defaultNormedPerson]

    jest.setTimeout(1000000)
})

test('test Semantic Scholar harvester.fetchPublications by Author Id', async () => {
    expect.hasAssertions()
    const expectedHarvestSet: HarvestSet = {
        sourceName: dsConfig.sourceName,
        searchPerson: defaultNormedPerson,
        query: semanticScholarDS.getAuthorQuery(defaultNormedPerson, getDateObject('2020-01-01'), getDateObject('2020-12-31')),
        sourcePublications: [],
        normedPublications: undefined, // expectedNormedPubsByAuthor[`${defaultNormedPerson.familyName}, ${defaultNormedPerson.givenNameInitial}`],
        offset: 0,
        pageSize: Number.parseInt(dsConfig.pageSize),
        totalResults: 10  // should only be 10 of 32 pubs after ones not 2020 are filtered out
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

test('test Semantic Scholar getAuthorQuery', () => {
    expect.hasAssertions()
    const authorQuery = semanticScholarDS.getAuthorQuery(defaultNormedPerson)
    expect(authorQuery).toEqual(`authorId:${defaultNormedPerson.sourceIds.semanticScholarIds}`)
})

test('test Semantic Scholar semanticScholarDataSource.getCoauthors', async () => {
    expect.hasAssertions()
    const coauthors = SemanticScholarDataSource.getCoauthors(defaultPubSourceMetadata)
    expect(coauthors).toEqual(expectedCoAuthors)
})

test('test Semantic Scholar semanticScholasrSource.getNormedPublications', () => {
    expect.hasAssertions()
    const testPubs = [ defaultPubSourceMetadata ]
    const normedPubResults = semanticScholarDS.getNormedPublications(testPubs, defaultNormedPerson)
    // expect(normedPubResults.length).toEqual(1)
    // as the source metadata can vary only check the other values and that source metadata is not null
    _.each(_.keys(normedPubResults[0]), (key) => {
        if (key === 'source_metadata') {
          expect(normedPubResults[0][key]).toBeDefined
        } else {
          expect(normedPubResults[0][key]).toEqual(defaultExpectedNormedPublication[key])
        }
    })
})