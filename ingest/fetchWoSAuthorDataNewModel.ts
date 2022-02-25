import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import Harvester from './modules/harvester'
import { WosDataSource } from './modules/wosDataSource'
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

  const harvestYearStr = process.env.WOS_HARVEST_YEARS
  const harvestYearStrArr = _.split(harvestYearStr, ',')
  const harvestYears = _.map(harvestYearStrArr, (yearStr) => {
    return Number.parseInt(yearStr)
  })

  const dsConfig: DataSourceConfig = {
    baseUrl: process.env.WOS_BASE_URL,
    queryUrl: process.env.WOS_QUERY_URL,
    userName: process.env.WOS_USERNAME,
    password: process.env.WOS_PASSWORD,
    sourceName: process.env.WOS_SOURCE_NAME,
    pageSize: process.env.WOS_PAGE_SIZE,  // page size must be a string for the request to work,
    harvestYears: harvestYears,
    requestInterval: Number.parseInt(process.env.WOS_REQUEST_INTERVAL),
    harvestDataDir: process.env.WOS_HARVEST_DATA_DIR,
    batchSize: Number.parseInt(process.env.HARVEST_BATCH_SIZE),
    harvestFileBatchSize: Number.parseInt(process.env.HARVEST_DIR_FILE_BATCH_SIZE),
    harvestThreadCount: Number.parseInt(process.env.WOS_HARVEST_THREAD_COUNT)
  }

  const ds: WosDataSource = new WosDataSource(dsConfig)
  const harvester: Harvester = new Harvester(ds, client)

  await harvester.executeHarvest()
}

main();
