import _, { min } from 'lodash'
import pMap from 'p-map'
import dotenv from 'dotenv'
import path from 'path'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import { isDir, loadDirList, loadJSONFromFile } from './units/loadJSONFromFile'
import NormedPublication from './modules/normedPublication'
import { Ingester } from './modules/ingester'
import moment from 'moment'
import { PublicationStatus } from './modules/publicationStatus'
import { command as writeCsv } from './units/writeCsv'
import IngesterConfig from './modules/ingesterConfig'

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

const getIngestFilePaths = require('./getIngestFilePaths');

const minConfidence = process.env.INGESTER_MIN_CONFIDENCE
const confidenceAlgorithmVersion = process.env.INGESTER_CONFIDENCE_ALGORITHM

//returns status map of what was done
async function main() {

  const pathsByYear = await getIngestFilePaths('../config/ingestFilePaths.json')

  
  const config: IngesterConfig = {
    minConfidence: Number.parseInt(minConfidence),
    confidenceAlgorithmVersion: confidenceAlgorithmVersion
  }
  const ingester = new Ingester(config, client)
  let ingestStatusByYear = new Map()
  let doiFailed = new Map()
  let combinedFailed: PublicationStatus[] = []

  let sourceName = undefined

  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Loading ${year} Publication Data`)
    //load data
    await pMap(pathsByYear[year], async (yearPath) => {
      let loadPaths = []
      if (isDir(yearPath)) {
        loadPaths = loadDirList(yearPath)
      } else {
        loadPaths.push(yearPath)
      }
      await pMap(loadPaths, async (filePath) => {
        // skip any subdirectories
        if (!isDir(filePath)){
          let dataDir = filePath
          if (!isDir(filePath)) {
            // go to parent folder if needed
            dataDir = path.dirname(filePath)
          } 
          const ingestStatus = await ingester.ingestFromFiles(dataDir, filePath, false)
          ingestStatusByYear[year] = ingestStatus
          combinedFailed = _.concat(combinedFailed, ingestStatus.failed)
        }
      }, { concurrency: 1 })
    }, { concurrency: 1})
  }, { concurrency: 1 }) // these all need to be 1 thread so no collisions on checking if pub already exists if present in multiple files

  // console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
  await pMap(_.keys(pathsByYear), async (year) => {
     // write combined failure results limited to 1 per doi
     if (combinedFailed && _.keys(combinedFailed).length > 0){
      const sourceName = combinedFailed[0].sourceName
      const combinedFailedValues = _.values(combinedFailed)
      const failedCSVFile = `../data/${sourceName}_combined_failed.${moment().format('YYYYMMDDHHmmss')}.csv`

      console.log(`Write failed doi's to csv file: ${failedCSVFile}`)
      // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
      //write data out to csv
      await writeCsv({
        path: failedCSVFile,
        data: combinedFailedValues,
      })

    }
    console.log(`DOIs errors for year ${year}: ${JSON.stringify(ingestStatusByYear[year].errorMessages, null, 2)}`)
    console.log(`DOIs failed: ${ingestStatusByYear[year].failed.length} for year: ${year}`)
    console.log(`DOIs added: ${ingestStatusByYear[year].added.length} for year: ${year}`)
    console.log(`DOIs skipped: ${ingestStatusByYear[year].skipped.length} for year: ${year}`)
  }, { concurrency: 1})
}

main()