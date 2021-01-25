import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import readFunders from './gql/readFunders'
import readFundersNameVariances from './gql/readFundersNameVariances'
import readSubfundersNameVariances from './gql/readSubfundersNameVariances'
import readAwardsWoutFunder from './gql/readAwardsWoutFunder'
// import updateAwardFunder from './gql/updateAwardFunder'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'
const Fuse = require('fuse.js')
import { randomWait } from './units/randomWait'
import { normalizeString, normalizeObjectProperties } from './units/normalizer'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

// environment variables
process.env.NODE_ENV = 'development';

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

function createFuzzyIndex (testKeys, funderMap) {
  // first normalize the diacritics
  const testFunderMap = _.map(funderMap, (funder) => {
    return normalizeObjectProperties(funder, testKeys, { skipLower: true })
 })

 const funderFuzzy = new Fuse(testFunderMap, {
   caseSensitive: false,
   shouldSort: true,
   includeScore: false,
   keys: testKeys,
   findAllMatches: false,
   threshold: 0.001,
 });

 return funderFuzzy
}


function funderMatchFuzzy (funderName, fuzzyIndex){
  // normalize last name checking against as well
  const testName = normalizeString(funderName, { skipLower: true })

  const funderResults = fuzzyIndex.search(testName)
  const reducedResults = _.map(funderResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  return reducedResults
}

async function getAwards () {
  const queryResult = await client.query(readAwardsWoutFunder())
  return queryResult.data.awards
}

async function getFunders () {
  const queryResult = await client.query(readFunders())
  return queryResult.data.funders
}

async function getFundersNameVariances () {
  const queryResult = await client.query(readFundersNameVariances())
  return queryResult.data.funders_namevariances
}

async function getSubfundersNameVariances () {
  const queryResult = await client.query(readSubfundersNameVariances())
  return queryResult.data.subfunders_namevariances
}

async function main (): Promise<void> {

  const awards = await getAwards()
  const funders = await getFunders()
  const funderNameVariances = await getFundersNameVariances()
  const subfunderNameVariances = await getSubfundersNameVariances()

  console.log(`Funders loaded are: ${JSON.stringify(funders, null, 2)}`)
  let subfunders = []
  _.each(funders, (funder) => {
    if (funder.subfunders) {
      subfunders = _.concat(subfunders, funder.subfunders)
    }
  })

  // extract funders name variance objects

  // first normalize the diacritics
  let funderMap = _.map(funders, (funder) => {
    return normalizeObjectProperties(funder, ['name', 'short_name'])
  })

  const subfunderMap = _.map(subfunders, (subfunder) => {
    return normalizeObjectProperties(subfunder, ['name', 'short_name'])
  })

  // combine funder and subfunder maps
  funderMap = _.concat(funderMap, subfunderMap)

  const funderVariancesMap = _.map(funderNameVariances, (funder) => {
    return normalizeObjectProperties(funder, ['name'])
  })

  const subfunderVariancesMap = _.map(subfunderNameVariances, (subfunder) => {
    return normalizeObjectProperties(subfunder, ['name'])
  })

  const multipleMatches = []
  const zeroMatches = []
  const singleMatches = []

  const multipleSubMatches = []
  const zeroSubMatches = []
  const singleSubMatches = []

  const funderFuzzyIndex = createFuzzyIndex(['name', 'short_name'], funderMap)
  const subset = _.chunk(awards, 1)

  let counter = 0
  // need to match against name, short_name, and variations (w a subset match)
  // need to add name variations
  await pMap(subset[0], async (award) => {
    counter += 1
    console.log(`${counter} - Checking award id: ${award['id']}`)
    console.log(`${counter} - Checking award: ${JSON.stringify(award, null, 2)}`)
    let matchedFunder = undefined
    if (award['funder_name']) {
      // TODO: Should this actually skip lower?  Below we have lots of lower case conversions
      const testFunder = normalizeString(award['funder_name'], { skipLower: true })
      const matchedFunders = funderMatchFuzzy(testFunder, funderFuzzyIndex)
      console.log(`Matched funders: ${JSON.stringify(matchedFunders, null, 2)}`)
      let matchedInfo = {
        'award_id': award['id'],
        'funder_name': award['funder_name']
      }
      if (matchedFunders.length > 1) {
        _.each(matchedFunders, (matched) => {
          if (_.toLower(matched['name']) === _.toLower(testFunder) ||
          _.toLower(matched['short_name']) === _.toLower(testFunder)) {
            matchedInfo['Matches'] = [matched]
          }
        })
        if (matchedInfo['Matches'] && matchedInfo['Matches'].length === 1) {
          singleMatches.push(matchedInfo)
        } else {
          matchedInfo['Matches'] = matchedFunders
          multipleMatches.push(matchedInfo)
        }
      } else if (matchedFunders.length <= 0) {
        zeroMatches.push(matchedInfo)
      } else {
        if (_.toLower(matchedFunders[0]['name']) === _.toLower(testFunder) ||
        _.toLower(matchedFunders[0]['short_name']) === _.toLower(testFunder)) {
          matchedInfo['Matches'] = matchedFunders
          singleMatches.push(matchedInfo)
        } else {
          zeroMatches.push(matchedInfo)
        }
      }
    }
  }, {concurrency: 60})

  console.log(`Multiple Matches: ${JSON.stringify(multipleMatches, null, 2)}`)
  console.log(`Multiple Matches Count: ${multipleMatches.length}`)
  console.log(`No Matches Count: ${zeroMatches.length}`)
  console.log(`Single Matches Count: ${singleMatches.length}`)

  console.log(`Multiple Sub Matches: ${JSON.stringify(multipleSubMatches, null, 2)}`)
  console.log(`Multiple Sub Matches Count: ${multipleSubMatches.length}`)
  console.log(`No Sub Matches Count: ${zeroSubMatches.length}`)
  console.log(`Single Sub Matches Count: ${singleSubMatches.length}`)
  
  //insert single matches
  let loopCounter = 0
  await pMap(singleMatches, async (matched) => {
    loopCounter += 1
    await randomWait(loopCounter)
    console.log(`Updating funder of award ${loopCounter} ${matched['funder']}`)
    const resultUpdatePubJournal = await client.mutate(updatePubJournal(matched['doi'], matched['Matches'][0]['id']))
    // console.log(`Returned result journal: ${JSON.stringify(resultUpdatePubJournal.data.update_publications.returning, null, 2)}`)
  }, {concurrency: 10})
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
