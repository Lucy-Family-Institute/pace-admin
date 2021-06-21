import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
// import { command as loadCsv } from './units/loadCsv'
import { randomWait } from './units/randomWait'
// const Fuse = require('fuse.js')
import dotenv from 'dotenv'
import readAllNewPersonPublications from './gql/readAllNewPersonPublications'

const getIngestFilePaths = require('./getIngestFilePaths');
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'

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

import { CalculateConfidence } from './modules/calculateConfidence'

async function main() {

  const calculateConfidence = new CalculateConfidence()

  // use related github commit hash for the version when algorithm last completed
  // @todo: Extract to ENV?
  const confidenceAlgorithmVersion = '82aa835eff3da48e497c6eb6b56dafc087c86958'
  // get confirmed author lists to papers
  const pathsByYear = await getIngestFilePaths("../config/ingestConfidenceReviewFilePaths.json")

  // get the set of persons to test
  const testAuthors = await calculateConfidence.getAllSimplifiedPersons()
  //create map of last name to array of related persons with same last name
  const personMap = _.transform(testAuthors, function (result, value) {
    _.each(value.names, (name) => {
      (result[name['lastName']] || (result[name['lastName']] = [])).push(value)
    })
  }, {})

  let confirmedAuthors = new Map()
  let confirmedAuthorsByDoiByYear = new Map()
  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Loading ${year} Confirmed Authors`)
    //load data
    await pMap(pathsByYear[year], async (path) => {
      confirmedAuthorsByDoiByYear[year] = await calculateConfidence.getConfirmedAuthorsByDoiFromCSV(path)
    }, { concurrency: 1})
  }, { concurrency: 1 })

  // combine the confirmed author lists together
  let confirmedAuthorsByDoi = new Map()
  _.each(_.keys(confirmedAuthorsByDoiByYear), (year) => {
    _.each(_.keys(confirmedAuthorsByDoiByYear[year]), (doi) => {
      confirmedAuthorsByDoi[doi] = _.concat((confirmedAuthorsByDoi[doi] || []), _.values(confirmedAuthorsByDoiByYear[year][doi]))
    })
  })


  // first do against current values and then have updated based on what is found
  // run against all pubs in DB and confirm have same confidence value calculation
  // calculate confidence for publications
  const testAuthors2 = []
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===53}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===17}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===94}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===78}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===48}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===61}))
  testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===197}))
  // console.log(`Test authors: ${JSON.stringify(testAuthors2, null, 2)}`)

  // get where last confidence test left off
  const lastConfidenceSet = await calculateConfidence.getLastPersonPubConfidenceSet()
  let mostRecentPersonPubId = undefined
  if (lastConfidenceSet) {
    // mostRecentPersonPubId = 11145
    mostRecentPersonPubId = lastConfidenceSet.persons_publications_id
    console.log(`Last Person Pub Confidence set is: ${mostRecentPersonPubId}`)
  } else {
    console.log(`Last Person Pub Confidence set is undefined`)
  }
  // const publicationYear = 2020
  const publicationYear = undefined

  // break up authors into groups of 20
  const testAuthorGroups = _.chunk(testAuthors, 10)
  await pMap (testAuthorGroups, async (authors, index) => {
    const confidenceTests = await calculateConfidence.calculateConfidence (mostRecentPersonPubId, authors, (confirmedAuthorsByDoi || {}), publicationYear)

    // next need to write checks found to DB and then calculate confidence accordingly
    let errorsInsert = []
    let passedInsert = []
    let totalConfidenceSets = 0
    let totalSetItems = 0
    let totalSetItemsInserted = 0

    console.log(`Exporting results to csv if any warnings or failures...`)
    if (confidenceTests['failed'] && confidenceTests['failed'].length>0){
      const outputFailed = _.map(confidenceTests['failed'], test => {
        test['author'] = JSON.stringify(test['author'])
        test['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
        test['confidenceItems'] = JSON.stringify(test['confidenceItems'])
        return test
      })

      //write data out to csv
      await writeCsv({
        path: `../data/failed_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
        data: outputFailed,
      });
    } else {
      console.log('No failures to output.')
    }

    if (confidenceTests['warning'] && confidenceTests['warning'].length>0){
      const outputWarning = _.map(confidenceTests['warning'], test => {
        test['author'] = JSON.stringify(test['author'])
        test['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
        test['confidenceItems'] = JSON.stringify(test['confidenceItems'])
        return test
      })

      await writeCsv({
        path: `../data/warning_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
        data: outputWarning,
      });
    } else {
      console.log('No warnings to output.')
    }

    // const outputPassed = _.map(confidenceTests['passed'], test => {
    //   let obj = {}
    //   obj['author'] = JSON.stringify(test['author'])
    //   obj['author_id'] = test['author']['id']
    //   obj['author_names'] = test['author']['names']
    //   obj['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
    //   obj['confidenceItems'] = JSON.stringify(test['confidenceItems'])
    //   return obj
    // })

    // await writeCsv({
    //   path: `../data/passed_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
    //   data: outputPassed,
    // });

    console.log('Beginning insert of confidence sets...')
    console.log(`Inserting Author Confidence Sets Batch (${(index + 1)} of ${testAuthorGroups.length})...`)
    await pMap (_.keys(confidenceTests), async (testStatus) => {
      // console.log(`trying to insert confidence values ${testStatus}`)
      let loopCounter = 1
      // console.log(`Inserting Author Confidence Sets ${testStatus} ${confidenceTests[testStatus].length}...`)
      await pMap (confidenceTests[testStatus], async (confidenceTest) => {
        // console.log('trying to insert confidence values')
        await randomWait(loopCounter)
        loopCounter += 1
        try {
          // console.log(`Tabulating total for ${JSON.stringify(confidenceTest, null, 2)}`)
          totalConfidenceSets += 1
          _.each(_.keys(confidenceTest['confidenceItems']), (rank) => {
            _.each(_.keys(confidenceTest['confidenceItems'][rank]), (confidenceType) => {
              totalSetItems += 1
            })
          })
          // console.log(`Starting to insert confidence set ${JSON.stringify(confidenceTest, null, 2)}`)
          const insertedConfidenceSetItems = await calculateConfidence.insertConfidenceTestToDB(confidenceTest, confidenceAlgorithmVersion)
          passedInsert.push(confidenceTest)
          totalSetItemsInserted += insertedConfidenceSetItems.length
        } catch (error) {
          errorsInsert.push(error)
          throw error
        }
      }, {concurrency: 1})
    }, {concurrency: 1})
    console.log('Done inserting confidence Sets...')
    console.log(`Errors on insert of confidence sets: ${JSON.stringify(errorsInsert, null, 2)}`)
    console.log(`Total Errors on insert of confidence sets: ${errorsInsert.length}`)
    console.log(`Total Sets Tried: ${totalConfidenceSets} Passed: ${passedInsert.length} Failed: ${errorsInsert.length}`)
    console.log(`Total Set Items Tried: ${totalSetItems} Passed: ${totalSetItemsInserted}`)
    console.log(`Passed tests: ${confidenceTests['passed'].length} Warning tests: ${confidenceTests['warning'].length} Failed Tests: ${confidenceTests['failed'].length}`)
  }, { concurrency: 1} )
}

main()
