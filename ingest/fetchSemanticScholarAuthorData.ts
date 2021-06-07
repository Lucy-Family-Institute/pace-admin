import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import moment from 'moment'
import dotenv from 'dotenv'
import { randomWait, wait } from './units/randomWait'
import { Harvester, HarvestOperation } from './modules/harvester'
import { SemanticScholarDataSource } from './modules/semanticScholarDataSource'
import { getAllNormedPersonsByYear } from '../ingest/modules/queryNormalizedPeople'
import NormedPerson from './modules/normedPerson'
import { getDateObject } from './units/dateRange'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'
import { createEmitAndSemanticDiagnosticsBuilderProgram } from 'typescript'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('../config/config.js');

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

  const dsConfig: DataSourceConfig = {
    baseUrl: 'https://api.semanticscholar.org/v1/',
    authorUrl: 'https://api.semanticscholar.org/v1/author/',
    queryUrl: 'https://api.semanticscholar.org/v1/',
    publicationUrl: 'https://api.semanticscholar.org/v1/paper/',
    sourceName: 'SemanticScholar',
    pageSize: '10000',  // page size must be a string for the request to work
    requestInterval: 3500
  }

  const semanticScholarDS: SemanticScholarDataSource = new SemanticScholarDataSource(dsConfig)
  const semanticScholarHarvester: Harvester = new Harvester(semanticScholarDS)

  const possibleAuthorIdsPath = '../data/input/new_semantic_scholar_ids.csv'
  const possibleAuthorIdsByPersonId: {} = await semanticScholarDS.loadPossibleAuthorIdsFromCSV(possibleAuthorIdsPath, 'person_id', 'matched_author_author_id')
  
  console.log(`Possible Author Ids by Person Id: ${JSON.stringify(possibleAuthorIdsByPersonId, null, 2)}`)
  const years = [ 2020 ]
  let succeededPapers = []
  let failedPapers = []
  let succeededAuthors = []
  let failedAuthors = []
  await pMap(years, async (year) => {
    let skippedAuthors = 0

    const normedPersons: NormedPerson[] = await getAllNormedPersonsByYear(year, client)

    const resultsDir = `../data/${dsConfig.sourceName}_${year}_${moment().format('YYYYMMDDHHmmss')}/`

    // console.log(`Person with harvest errors for ${year} are: ${JSON.stringify(personWithHarvestErrors,null,2)}`)
    // console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons,null,2)}`)
    // console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons.length,null,2)}`)


    let personCounter = 0
    
    // const normedPersons: NormedPerson[] = [person, person2]
    const subset = _.chunk(normedPersons, 1)
    // await pMap(personWithHarvestErrors, async (person) => {
    await pMap(subset, async (persons) => {
      try {
        personCounter += 1
        const person = persons[0]
        const personId = person['id']
        if (person.sourceIds && person.sourceIds.semanticScholarId || possibleAuthorIdsByPersonId[`${personId}`]) {
          console.log(`Getting papers for ${person.familyName}, ${person.givenName}`)
          // run for each name plus name variance, put name variance second in case undefined
          // let searchNames = _.concat([{given_name: person.firstName, family_name: person.lastName }], person.nameVariances)
          // if (person.id === 2052) {
          // do for each possible id
          let semanticScholarIds = []
          if (!person.sourceIds) {
            person.sourceIds = {}
          }
          
          if (person.sourceIds && person.sourceIds.semanticScholarId) {
            semanticScholarIds.push(person.sourceIds.semanticScholarId)
          } else if (possibleAuthorIdsByPersonId[`${personId}`]) {
            semanticScholarIds = _.concat(semanticScholarIds, possibleAuthorIdsByPersonId[`${personId}`])
          }
          await pMap(semanticScholarIds, async (scholarId) => {
            let harvestPerson = _.clone(person)
            harvestPerson.sourceIds.semanticScholarId = scholarId
            const harvestPersons = [harvestPerson]
            await semanticScholarHarvester.harvestToCsv(resultsDir, persons, HarvestOperation.QUERY_BY_AUTHOR_ID, getDateObject(`${year}-01-01`), getDateObject(`${year}-12-31`), `${person.familyName}_${person.givenName}`)
              // await pMap(searchNames, async (searchName) => {
            await wait(1500)
          }, { concurrency: 1})
            
          // }, { concurrency: 1})
          succeededAuthors = _.concat(succeededAuthors, persons)
          // } else {
          //   console.log(`Skipping author ${person.familyName}, ${person.givenName} persons`)
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
  }, { concurrency: 1 })
}

main();
