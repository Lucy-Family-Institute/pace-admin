import _, { min, truncate } from 'lodash'
import pMap from 'p-map'
import dotenv from 'dotenv'
import path from 'path'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import FsHelper from './units/fsHelper'
import NormedPublication from './modules/normedPublication'
import { Ingester } from './modules/ingester'
import moment from 'moment'
import { PublicationStatus } from './modules/publicationStatus'
import { command as writeCsv } from './units/writeCsv'
import IngesterConfig from './modules/ingesterConfig'
import Normalizer from './units/normalizer'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

// make sure to not be caching results if checking doi more than once
const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
  },
})

const minConfidence = process.env.INGESTER_MIN_CONFIDENCE
const confidenceAlgorithmVersion = process.env.INGESTER_CONFIDENCE_ALGORITHM
const defaultWaitInterval = process.env.INGESTER_DEFAULT_WAIT_INTERVAL
const checkForNewPersonMatches = process.env.INGESTER_CHECK_FOR_NEW_PERSON_MATCHES
const overwriteConfidenceSets = process.env.INGESTER_OVERWRITE_CONFIDENCE_SETS
const outputWarnings = process.env.INGESTER_OUTPUT_WARNINGS
const outputPassed = process.env.INGESTER_OUTPUT_PASSED
const confirmedAuthorFileDir = process.env.INGESTER_CONFIRMED_AUTHOR_FILE_DIR
const defaultToBibTex = process.env.INGESTER_DEFAULT_TO_BIBTEX
const dedupByDoi = process.env.INGESTER_DEDUP_BY_DOI
const stagedIngestDir = process.env.INGESTER_STAGED_DIR
const outputIngestDir = process.env.INGESTER_OUTPUT_DIR
const centerMemberYear = process.env.INGESTER_CENTER_MEMBER_YEAR
const loggingBatchSize = process.env.INGESTER_LOGGING_BATCH_SIZE
const loadPageSize = process.env.INGESTER_LOAD_BATCH_SIZE
const threadCount = process.env.INGESTER_THREAD_COUNT
const types = _.split(process.env.INGESTER_PUBLICATION_TYPES, ',')

//returns status map of what was done
async function main() {
  const config: IngesterConfig = {
    minConfidence: Number.parseFloat(minConfidence),
    confidenceAlgorithmVersion: confidenceAlgorithmVersion,
    checkForNewPersonMatches: Normalizer.stringToBoolean(checkForNewPersonMatches),
    overwriteConfidenceSets: Normalizer.stringToBoolean(overwriteConfidenceSets),
    outputWarnings: Normalizer.stringToBoolean(outputWarnings),
    outputPassed: Normalizer.stringToBoolean(outputPassed),
    defaultWaitInterval: Number.parseInt(defaultWaitInterval),
    confirmedAuthorFileDir: confirmedAuthorFileDir,
    defaultToBibTex: Normalizer.stringToBoolean(defaultToBibTex),
    dedupByDoi: Normalizer.stringToBoolean(dedupByDoi),
    stagedIngestDir: stagedIngestDir,
    outputIngestDir: outputIngestDir,
    centerMemberYear: Number.parseInt(centerMemberYear),
    loggingBatchSize: Number.parseInt(loggingBatchSize),
    loadPageSize: Number.parseInt(loadPageSize),
    threadCount: (threadCount ? Number.parseInt(threadCount) : undefined),
    publicationTypes: types
  }
  const ingester = new Ingester(config, client)
  await ingester.ingestStagedFiles()
 }

main()
