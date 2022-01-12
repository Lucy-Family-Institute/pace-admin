import _, { min, truncate } from 'lodash'
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
import IngestStatus from './modules/ingestStatus'

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
const defaultWaitInterval = process.env.INGESTER_DEFAULT_WAIT_INTERVAL
const checkForNewPersonMatches = process.env.INGESTER_CHECK_FOR_NEW_PERSON_MATCHES
const overwriteConfidenceSets = process.env.INGESTER_OVERWRITE_CONFIDENCE_SETS
const outputWarnings = process.env.INGESTER_OUTPUT_WARNINGS
const outputPassed = process.env.INGESTER_OUTPUT_PASSED

function stringToBoolean(value: string): boolean{
  let returnVal
  try {
    const num = Number.parseInt(value)
    if (num === 1) {
      return true
    } else if (num === 0) {
      return false
    } else {
      throw(`Unknown boolean value encountered, unable to convert value: ${value}.  The value should be formatted as '1', '0', 'true', or 'false'`)
    }
  } catch (error) {
    // try string values of 'false' and 'true' instead
    if (value && value.toLowerCase() === 'true') {
      return true
    } else if (value && value.toLowerCase() === 'false') {
      return false
    } else {
      throw(`Unknown boolean value encountered, unable to convert value: ${value}.  The value should be formatted as '1', '0', 'true', or 'false'`)
    }
  }
}

//returns status map of what was done
async function main() {

  const pathsByYear = await getIngestFilePaths('../config/ingestFilePaths.json')

  
  const config: IngesterConfig = {
    minConfidence: Number.parseInt(minConfidence),
    confidenceAlgorithmVersion: confidenceAlgorithmVersion,
    checkForNewPersonMatches: stringToBoolean(checkForNewPersonMatches),
    overwriteConfidenceSets: stringToBoolean(overwriteConfidenceSets),
    outputWarnings: stringToBoolean(outputWarnings),
    outputPassed: stringToBoolean(outputPassed),
    defaultWaitInterval: Number.parseInt(defaultWaitInterval)
  }
  const ingester = new Ingester(config, client)
  let ingestStatusByYear: Map<number,IngestStatus> = new Map()
  let ingestStatusMain = new IngestStatus()
  let doiFailed = new Map()
  let combinedStatus: PublicationStatus[] = []

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
          let fileName = path.basename(filePath)
          if (!isDir(filePath)) {
            // go to parent folder if needed
            dataDir = path.dirname(filePath)
          } 
          const ingestStatus = await ingester.ingestFromFiles(dataDir, filePath, config.checkForNewPersonMatches, config.overwriteConfidenceSets, false)
          if (!ingestStatusByYear[year]) {
            ingestStatusByYear[year] = new Map()
          }
          ingestStatusByYear[year][fileName] = ingestStatus
          ingestStatusMain = IngestStatus.merge(ingestStatusMain, ingestStatus)
          combinedStatus = _.concat(combinedStatus, ingestStatus.failedAddPublications)
          if (config.outputWarnings) {
            combinedStatus = _.concat(combinedStatus, ingestStatus.skippedAddPublications)
          }  
          if (config.outputPassed) {
            combinedStatus = _.concat(combinedStatus, ingestStatus.addedPublications)
          }     
        }
      }, { concurrency: 1 })
    }, { concurrency: 1})
  }, { concurrency: 1 }) // these all need to be 1 thread so no collisions on checking if pub already exists if present in multiple files

  // console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
  await pMap(_.keys(pathsByYear), async (year) => {
     // write combined failure results limited to 1 per doi
     if (combinedStatus && _.keys(combinedStatus).length > 0){
      const sourceName = combinedStatus[0].sourceName
      const combinedStatusValues = _.values(combinedStatus)
      const statusCSVFile = `../data/${sourceName}_${year}_combined_status.${moment().format('YYYYMMDDHHmmss')}.csv`

      console.log(`Write status of doi's to csv file: ${statusCSVFile}, output warnings: ${config.outputWarnings}, output passed: ${config.outputPassed}`)
      // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
      //write data out to csv
      await writeCsv({
        path: statusCSVFile,
        data: combinedStatusValues,
      })

    }
    _.each(_.keys(ingestStatusByYear[year]), (fileName) => {
      console.log(`DOIs errors for year - '${year}' and file - '${fileName}':\n${JSON.stringify(ingestStatusByYear[year][fileName].errorMessages, null, 2)}`)
      console.log(`DOIs warnings for year - '${year}' and file - '${fileName}':\n${JSON.stringify(ingestStatusByYear[year][fileName].warningMessages, null, 2)}`)
      console.log(`DOIs failed add publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].failedAddPublications.length}`)
      console.log(`DOIs added publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].addedPublications.length}`)
      console.log(`DOIs skipped add publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].skippedAddPublications.length}`)
      console.log(`DOIs failed add person publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].failedAddPersonPublications.length}`)
      console.log(`DOIs added person publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].addedPersonPublications.length}`)
      console.log(`DOIs skipped add person publications for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].skippedAddPersonPublications.length}`)
      console.log(`DOIs failed add confidence sets for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].failedAddConfidenceSets.length}`)
      console.log(`DOIs added confidence sets for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].addedConfidenceSets.length}`)
      console.log(`DOIs skipped add confidence sets for year - '${year}' and file - '${fileName}': ${ingestStatusByYear[year][fileName].skippedAddConfidenceSets.length}`)
    })
  }, { concurrency: 1})
  // now output main ingest status

  // write combined failure results limited to 1 per doi
  if (ingestStatusMain && 
    (ingestStatusMain.failedAddPublications.length > 0 || 
    ingestStatusMain.failedAddPersonPublications.length > 0 || 
    ingestStatusMain.failedAddConfidenceSets.length > 0) ||
    (outputWarnings && 
      (ingestStatusMain.skippedAddPublications.length > 0 || 
      ingestStatusMain.skippedAddPersonPublications.length > 0 || 
      ingestStatusMain.skippedAddConfidenceSets.length > 0))){
    let sourceName
    if (ingestStatusMain.failedAddPublications.length > 0) {
      sourceName = ingestStatusMain.failedAddPublications[0].sourceName
    } else if (ingestStatusMain.failedAddPersonPublications.length > 0) {
      sourceName = ingestStatusMain.failedAddPersonPublications[0].sourceName
    } else {
      sourceName = ingestStatusMain.failedAddConfidenceSets[0].sourceName
    }
    let combinedStatusValues = []
    combinedStatusValues = _.concat(combinedStatusValues, ingestStatusMain.failedAddPublications)
    if (config.outputWarnings) {
      combinedStatusValues = _.concat(combinedStatusValues, ingestStatusMain.skippedAddPublications)
    } 
    if (config.outputPassed) {
      combinedStatusValues = _.concat(combinedStatusValues, ingestStatusMain.addedPublications)
    }     
    const statusCSVFile = `../data/${sourceName}_all_combined_status.${moment().format('YYYYMMDDHHmmss')}.csv`

    console.log(`Write all doi status to csv file: ${statusCSVFile}, output warnings: ${config.outputWarnings}, output passed: ${config.outputPassed}`)
    // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
    //write data out to csv
    await writeCsv({
      path: statusCSVFile,
      data: combinedStatusValues,
    })

  }
  console.log(`DOIs errors for all':\n${JSON.stringify(ingestStatusMain.errorMessages, null, 2)}`)
  console.log(`DOIs warnings for all':\n${JSON.stringify(ingestStatusMain.warningMessages, null, 2)}`)
  console.log(`DOIs failed add publications for all': ${ingestStatusMain.failedAddPublications.length}`)
  console.log(`DOIs added publications for all': ${ingestStatusMain.addedPublications.length}`)
  console.log(`DOIs skipped add publications for all': ${ingestStatusMain.skippedAddPublications.length}`)
  console.log(`DOIs failed add person publications for all': ${ingestStatusMain.failedAddPersonPublications.length}`)
  console.log(`DOIs added person publications for all': ${ingestStatusMain.addedPersonPublications.length}`)
  console.log(`DOIs skipped add person publications for all': ${ingestStatusMain.skippedAddPersonPublications.length}`)
  console.log(`DOIs failed add confidence sets for all': ${ingestStatusMain.failedAddConfidenceSets.length}`)
  console.log(`DOIs added confidence sets for all': ${ingestStatusMain.addedConfidenceSets.length}`)
  console.log(`DOIs skipped add confidence sets for all': ${ingestStatusMain.skippedAddConfidenceSets.length}`)
}

main()
