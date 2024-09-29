import _ from 'lodash'
import moment from 'moment'
import fs from 'fs'
import pMap from 'p-map'
import path from 'path'
import { command as loadCsv } from './units/loadCsv'
import { command as writeCsv} from './units/writeCsv'
import { wait } from './units/randomWait'
import writeToJSONFile from './units/writeToJSONFile'
import FsHelper from './units/fsHelper'
import Csl from './modules/csl'
import CslDate from './modules/cslDate'

import fetch from 'node-fetch'
import dotenv from 'dotenv'


dotenv.config({
  path: '../.env'
})

// environment variables
process.env.NODE_ENV = 'development';

// if default to bibtex is true then it skips retrieval by doi, and constructs the csl from bibtex
async function getCsl (doi: string): Promise<Csl> {
  // let cslRecords = undefined
  let csl: Csl = undefined
  try {
    csl = await Csl.getCsl(doi)
    // console.log(`Csl is: ${JSON.stringify(csl, null, 2)}`)
  } catch (error) {
    console.log(`Error on get csl: ${error}`)
    // throw (error)
  }
  return csl 
}

async function main () {

  const crossRefDOIFilePath = process.env.CROSSREF_DOI_FILE
  const crossRefUpdatedDOIFileDir = process.env.CROSSREF_UPDATED_DOI_FILE_DIR
  const waitTime = process.env.CROSSREF_REQUEST_INTERVAL
  
  // load publication list
  const pubs = await loadCsv({
    path: crossRefDOIFilePath,
  });

  // console.log(`CSV loaded: ${JSON.stringify(pubs, null, 2)}`)

  // fetch csl records
  let updatedPubs = []
  let counter = 0
  let skippedCounter = 0
  let errorCounter = 0
  let foundCounter = 0

  console.log(`Getting ISSN for '${pubs.length}' pubs`)
  await pMap(pubs, async (pub) => {
  // const pub = pubs[0]
    counter += 1
    const doi = pub['Real DOI']
    if (doi && doi.length > 0) {
      const csl = await getCsl(doi)
      if (csl) {
        const issn = csl.valueOf()['ISSN']
        pub['ISSN'] = issn 
        console.log(`${counter}: Found DOI: '${doi}' and ISSN: '${csl.valueOf()['ISSN']}'`)
        foundCounter += 1
      } else {
        console.log(`${counter}: No ISSN for DOI: '${doi}'`)
        errorCounter += 1
      }
    } else {
      console.log(`${counter}: Skipping with no DOI set`)
      skippedCounter += 1
    }
    updatedPubs.push(pub)
    await wait(waitTime)
  }, { concurrency: 1 })

  console.log(`Getting ISSN Found: ${foundCounter}, Skipped: ${skippedCounter} Errors: ${errorCounter}`)

  FsHelper.createDirIfNotExists(crossRefUpdatedDOIFileDir, true)

  const baseFilePath = FsHelper.getFileName(crossRefDOIFilePath)
  let filePath = `${crossRefUpdatedDOIFileDir}/`
  filePath = `${filePath}Pubs_w_issn.${moment().format('YYYYMMDDHHmmss')}.${baseFilePath}`
  console.log(`Writing data to csv: '${filePath}'`)
  //write data out to csv
  await writeCsv({
    path: filePath,
    data: updatedPubs
  });
  // console.log(`CSV updated: ${JSON.stringify(updatedPubs, null, 2)}`)
  // output csv with issn
  // let doi = '10.14359/51738457'
  // await getCsl(doi)
}

main()