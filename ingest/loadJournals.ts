import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pEachSeries from 'p-each-series'
import insertJournal from './gql/insertJournal'
import insertJournalClassification from './gql/insertJournalClassification'
import readClassifications from './gql/readClassifications'
import { command as loadCsv } from './units/loadCsv'
import { responsePathAsArray } from 'graphql'
import Cite from 'citation-js'
import pMap from 'p-map'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'
import dotenv from 'dotenv'
import { randomWait } from './units/randomWait'

dotenv.config({
  path: '../.env'
})

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

async function getSimplifiedJournals (journals) {
  return _.map(journals, (journal) => {
    return {
      title: journal[_.keys(journal)[0]],
      publisher: journal['publisher'],
      issn: journal['issn'],
      e_issn: journal['e-issn'],
      journal_type: journal['type']
    }
  })
}

async function getAsjcCodesByTitle (journals) {
  let codesByTitle = {}
  _.each(journals, (journal) => {
    codesByTitle[journal[_.keys(journal)[0]]] = journal.asjc_code
  })
  return codesByTitle
}

async function insertJournalsToDB (journals) {
  try {
    const mutateJournalResult = await client.mutate(
      insertJournal (journals)
    )
    console.log(`mutate result keys are: ${_.keys(mutateJournalResult.data)}`)
    return mutateJournalResult.data.insert_journals.returning
    //console.log(`Insert mutate journal (`${mutateJournalResult.data.insert_journals.returning[0].id }`);
    // const journalId = 0+parseInt(`${mutateJournalResult.data.insert_journals.returning.id }`);
    // console.log(`Added journal with id: ${journalId}`)
  } catch (error) {
    throw error
  }
}

async function insertJournalClassificationsToDB (journalClassifications) {
  try {
    // insert classifications
    const mutateJournalClassificationResult = await client.mutate(
      insertJournalClassification(journalClassifications)
    )
    return mutateJournalClassificationResult.data.insert_journals_classifications.returning
  } catch (error) {
    throw error
  }
}

async function loadClassifications () {
  const queryResult = await client.query(readClassifications())
  return _.mapKeys(queryResult.data.classifications, (classification) => {
    return classification['identifier']
  })
}

//returns a map of three arrays: 'addedJournals','failedJournals', 'errorMessages'
async function loadJournalsFromCSV (csvPath, classifications) {
  try {
    console.log(`Loading Journals from path: ${csvPath}`)
    const journals: any = await loadCsv({
     path: csvPath
    })

    //normalize column names to all lowercase
    const lowerJournals = _.map(journals, function (journal) {
      const lowerJournal =  _.mapKeys(journal, function (value, key) {
        return key.toLowerCase()
      })
        //parse asjc code string into array
      const codes = []
      _.each(lowerJournal['asjc_code'].split(';'), (code) => {
        const trimmed = _.trim(code)
        if (trimmed.length > 0) {
          codes.push(_.trim(code))
        }
      })
      _.set(lowerJournal, 'asjc_code', codes)
      return lowerJournal
    })

    const simplifiedJournals = await getSimplifiedJournals(lowerJournals)
    const codesByTitle = await getAsjcCodesByTitle(lowerJournals)

    console.log(`After lowercase ${_.keys(lowerJournals[0])}`)
    // console.log(`Loaded Journals: ${JSON.stringify(lowerJournals, null, 2)}`)

    console.log(`Preparing journal for insert: ${JSON.stringify(lowerJournals[0], null, 2)}`)
    // const journal = lowerJournals[0]
    let loopCounter = 0
    // insert in batches
    const batchSize = 1000
    const batches = _.chunk(simplifiedJournals, batchSize)
    await pMap(batches, async (journals) => {
      //insert batch
      loopCounter += 1
      console.log(`Trying to insert ${journals.length} journals for loop ${loopCounter}`)
      //prepare batch

      //have each wait a pseudo-random amount of time between 1-5 seconds
      await randomWait(loopCounter)
      const insertedJournals = await insertJournalsToDB(journals)
      // map journal title to id
      const insertedJournalsByTitle = _.groupBy(insertedJournals, (journal) => {
        return journal['title']
      })
      _.each(_.keys(insertedJournalsByTitle), (title) => {
        console.log(`Inserted journal title: ${title}`)
      })

      // insert associated classifications
      let insertClassifications = []
      _.each(_.keys(insertedJournalsByTitle), (title) => {
        _.each(insertedJournalsByTitle[title], (journal) => {
          _.each(codesByTitle[title], (code) => {
            // if not a registered classfication just skip for now
            if (classifications[code]) {
              const obj = {
                journal_id: journal['id'],
                classification_id: classifications[code].id
              }
              insertClassifications.push(obj)
            }
          })
        })
      })
      // console.log(`Trying to insert journal classifications ${JSON.stringify(insertClassifications, null, 2)}`)
      const insertedClassifications = await insertJournalClassificationsToDB(insertClassifications)
      console.log(`Added journal classifications for current batch ${JSON.stringify(insertedClassifications.length, null, 2)}`)
    }, {concurrency: 1})

    return journals
  } catch (error){
    throw error
  }
}

//returns status map of what was done
async function main() {

  const paths = ['../data/asjc_journals_1.csv', '../data/asjc_journals_2.csv']
  const classifications = await loadClassifications()
  await pMap(paths, async (path) => {
    const journalStatus = await loadJournalsFromCSV(path, classifications)
  }, { concurrency: 1 })
}

main()
