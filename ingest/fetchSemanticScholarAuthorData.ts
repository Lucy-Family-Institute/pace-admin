import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import moment from 'moment'
import dotenv from 'dotenv'
import path from 'path'
import { randomWait, wait } from './units/randomWait'
import { Harvester, HarvestOperation } from './modules/harvester'
import { SemanticScholarDataSource } from './modules/semanticScholarDataSource'
import { getAllNormedPersonsByYear } from '../ingest/modules/queryNormalizedPeople'
import NormedPerson from './modules/normedPerson'
import { getDateObject } from './units/dateRange'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'
import { createEmitAndSemanticDiagnosticsBuilderProgram } from 'typescript'
import NormedPublication from './modules/normedPublication'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
// const config = require('../config/config.js');

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main (): Promise<void> {

  const harvestStartYear = Number.parseInt(process.env.SEMANTIC_SCHOLAR_HARVEST_START_YEAR)
  const harvestEndYear = Number.parseInt(process.env.SEMANTIC_SCHOLAR_HARVEST_END_YEAR)
  let harvestYears = []

  for (let index = 0; index <= harvestEndYear - harvestStartYear; index++) {
    harvestYears.push((harvestStartYear+index))
  }

  const dsConfig: DataSourceConfig = {
    baseUrl: process.env.SEMANTIC_SCHOLAR_BASE_URL,
    authorUrl: process.env.SEMANTIC_SCHOLAR_AUTHOR_URL,
    queryUrl: process.env.SEMANTIC_SCHOLAR_QUERY_URL,
    publicationUrl: process.env.SEMANTIC_SCHOLAR_PUBLICATION_URL,
    sourceName: process.env.SEMANTIC_SCHOLAR_SOURCE_NAME,
    pageSize: process.env.SEMANTIC_SCHOLAR_PAGE_SIZE,  // page size must be a string for the request to work
    requestInterval: Number.parseInt(process.env.SEMANTIC_SCHOLAR_REQUEST_INTERVAL),
    harvestYears: harvestYears,
    harvestDataDir: process.env.SEMANTIC_SCHOLAR_HARVEST_DATA_DIR,
    batchSize: Number.parseInt(process.env.HARVEST_BATCH_SIZE)
  }

  const semanticScholarDS: SemanticScholarDataSource = new SemanticScholarDataSource(dsConfig)
  const semanticScholarHarvester: Harvester = new Harvester(semanticScholarDS)

  // const possibleAuthorIdsPath = '../data/input/new_semantic_scholar_ids.csv'
  // const possibleAuthorIdsByPersonId: {} = await semanticScholarDS.loadPossibleAuthorIdsFromCSV(possibleAuthorIdsPath, 'person_id', 'matched_author_author_id')
  
  // console.log(`Possible Author Ids by Person Id: ${JSON.stringify(possibleAuthorIdsByPersonId, null, 2)}`)
  // const years = [ 2019, 2020, 2021 ]
  const minYear = dsConfig.harvestYears[0].valueOf()
  const maxYear = dsConfig.harvestYears.reverse()[0].valueOf()
  let succeededPapers = []
  let failedPapers = []
  let succeededAuthors = []
  let failedAuthors = []

  let normedPersonsById = {}
  let skippedAuthors = 0

  for (let index = 0; index <= maxYear - minYear; index++) {
  //await pMap(years, async (year) => {

    const normedPersonsByYear: NormedPerson[] = await getAllNormedPersonsByYear((minYear + index), client)
    _.each (normedPersonsByYear, (normedPerson: NormedPerson) => {
      normedPersonsById[`${normedPerson.id}`] = normedPerson 
    })
  } //, { concurrency: 1 })


  const resultsDir = path.join(process.cwd(), dsConfig.harvestDataDir, `${dsConfig.sourceName}_${minYear}-${maxYear}_${moment().format('YYYYMMDDHHmmss')}/`)

  // console.log(`Person with harvest errors for ${year} are: ${JSON.stringify(personWithHarvestErrors,null,2)}`)
  // console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons,null,2)}`)
  // console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons.length,null,2)}`)


  let personCounter = 0
  
  // const normedPersons: NormedPerson[] = [person, person2]
  const normedPersons: NormedPerson[] = _.values(normedPersonsById)
  const subset = _.chunk(normedPersons, 1)
  // await pMap(personWithHarvestErrors, async (person) => {
  await pMap(subset, async (persons: NormedPerson[]) => {
    try {
      personCounter += 1
      const person = persons[0]
      const personId = person['id']
      if (person.sourceIds && person.sourceIds.semanticScholarIds) { // || possibleAuthorIdsByPersonId[`${personId}`]) {
        // run for each name plus name variance, put name variance second in case undefined
        // let searchNames = _.concat([{given_name: person.firstName, family_name: person.lastName }], person.nameVariances)
        // if (person.id === 157) {
        console.log(`Getting papers for ${person.familyName}, ${person.givenName}`)
        // do for each possible id
        let semanticScholarIds = []
        if (!person.sourceIds) {
          person.sourceIds = {}
        }
        
        if (person.sourceIds && person.sourceIds.semanticScholarIds) {
          semanticScholarIds = person.sourceIds.semanticScholarIds
        }
        // } else if (possibleAuthorIdsByPersonId[`${personId}`]) {
        //   semanticScholarIds = _.concat(semanticScholarIds, possibleAuthorIdsByPersonId[`${personId}`])
        // }
        let harvestPerson = _.clone(person)
        harvestPerson.sourceIds.semanticScholarIds = semanticScholarIds
        const harvestPersons = [harvestPerson]
        await semanticScholarHarvester.harvestToCsv(resultsDir, harvestPersons, HarvestOperation.QUERY_BY_AUTHOR_ID, getDateObject(`${minYear}-01-01`), getDateObject(`${maxYear}-12-31`), `${person.familyName}_${person.givenName}`)
          // await pMap(searchNames, async (searchName) => {
        await wait(1500)
          
        // }, { concurrency: 1})
        succeededAuthors = _.concat(succeededAuthors, persons)
        // } else {
        //   console.log(`Skipping author ${person.familyName}, ${person.givenName} persons`)
        //   skippedAuthors += 1
        // }
      } else {
        console.log(`Skipping author '${person.familyName}, ${person.givenName}' with no semantic scholar Id defined`)
        skippedAuthors += 1
      }
    } catch (error) {
      const errorMessage = `Error on get Semantic Scholar papers for authors: ${JSON.stringify(persons, null, 2)}: ${error}`
      failedPapers.push(errorMessage)
      _.concat(failedAuthors, persons)
      console.log(errorMessage)
    }
  }, {concurrency: 1})
  console.log(`Retrieved papers for ${normedPersons.length - skippedAuthors} authors, skipped ${skippedAuthors} authors`)
}

main();
