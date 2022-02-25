import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import Harvester from './modules/harvester'
import { CrossRefDataSource } from './modules/crossrefDataSource'
import NormedPerson from './modules/normedPerson'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'

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

  const harvestYearStr = process.env.CROSSREF_HARVEST_YEARS
  const harvestYearStrArr = _.split(harvestYearStr, ',')
  const harvestYears = _.map(harvestYearStrArr, (yearStr) => {
    return Number.parseInt(yearStr)
  })

  const crossrefConfig: DataSourceConfig = {
    baseUrl: process.env.CROSSREF_BASE_URL,
    queryUrl: process.env.CROSSREF_QUERY_URL,
    sourceName: process.env.CROSSREF_SOURCE_NAME,
    pageSize: process.env.CROSSREF_PAGE_SIZE,  // page size must be a string for the request to work,
    harvestYears: harvestYears,
    requestInterval: Number.parseInt(process.env.CROSSREF_REQUEST_INTERVAL),
    harvestDataDir: process.env.CROSSREF_HARVEST_DATA_DIR,
    batchSize: Number.parseInt(process.env.HARVEST_BATCH_SIZE),
    harvestFileBatchSize: Number.parseInt(process.env.HARVEST_DIR_FILE_BATCH_SIZE),
    harvestThreadCount: Number.parseInt(process.env.CROSSREF_HARVEST_THREAD_COUNT)
  }

  const crossrefDS: CrossRefDataSource = new CrossRefDataSource(crossrefConfig)
  const crossrefHarvester: Harvester = new Harvester(crossrefDS, client)
  
  await crossrefHarvester.executeHarvest()
}

main();
