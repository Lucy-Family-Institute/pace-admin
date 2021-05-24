import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import pTimes from 'p-times'
import readPersonsByYearAllCenters from '../client/src/gql/readPersonsByYearAllCenters'
import readPublicationsByPersonByConfidence from '../client/src/gql/readPublicationsByPersonByConfidence'
import { command as loadCsv } from './units/loadCsv'
import { split } from 'apollo-link'
// import cslParser from './utils/cslParser'
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'
import dotenv from 'dotenv'
import resolve from 'path'
const xmlToJson = require('xml-js');
import { randomWait, wait } from './units/randomWait'
import { Harvester, HarvestOperation } from './modules/harvester'
import { CrossRefDataSource } from './modules/crossrefDataSource'
import { getAllNormedPersonsByYear } from '../ingest/modules/queryNormalizedPeople'
import NormedPerson from './modules/normedPerson'
import { getDateObject } from './units/dateRange'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');
const WOS_USERNAME = process.env.WOS_USERNAME
const WOS_PASSWORD = process.env.WOS_PASSWORD
const WOS_API_LITE_KEY = process.env.WOS_API_LITE_KEY

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

  const crossrefConfig: DataSourceConfig = {
    baseUrl: 'https://api.crossref.org',
    queryUrl: 'https://api.crossref.org/works',
    sourceName: 'CrossRef',
    pageSize: '100',  // page size must be a string for the request to work
    requestInterval: 1000
  }

  const crossrefDS: CrossRefDataSource = new CrossRefDataSource(crossrefConfig)
  const crossrefHarvester: Harvester = new Harvester(crossrefDS)
  
  const years = [ 2020 ]
  // const scopusAffiliationId = "60021508"
  let succeededPapers = []
  let failedPapers = []
  let succeededAuthors = []
  let failedAuthors = []
  await pMap(years, async (year) => {
    const normedPersons = await getAllNormedPersonsByYear(year, client)

    // console.log(`Person with harvest errors for ${year} are: ${JSON.stringify(personWithHarvestErrors,null,2)}`)
    console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons,null,2)}`)
    console.log(`Normed persons for ${year} are: ${JSON.stringify(normedPersons.length,null,2)}`)


    let personCounter = 0

    const subset = _.chunk(normedPersons, 10)
    // await pMap(personWithHarvestErrors, async (person) => {
    await pMap(subset, async (persons) => {
      try {
        personCounter += 1
        console.log(`Getting papers for ${persons.length} persons`)
        // run for each name plus name variance, put name variance second in case undefined
        // let searchNames = _.concat([{given_name: person.firstName, family_name: person.lastName }], person.nameVariances)
        crossrefHarvester.harvestToCsv(persons,HarvestOperation.QUERY_BY_AUTHOR_NAME, getDateObject(`${year}-01-01`), getDateObject(`${year}-12-31`))
        // await pMap(searchNames, async (searchName) => {
        await wait(1500)
          
        // }, { concurrency: 1})
        _.concat(succeededAuthors, persons)
      } catch (error) {
        const errorMessage = `Error on get CrossRewf papers for authors: ${JSON.stringify(persons, null, 2)}: ${error}`
        failedPapers.push(errorMessage)
        _.concat(failedAuthors, persons)
        console.log(errorMessage)
      }
    }, {concurrency: 1})
  }, { concurrency: 1 })
}

main();
