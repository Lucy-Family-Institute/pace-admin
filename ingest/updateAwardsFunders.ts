import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
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

// replace diacritics with alphabetic character equivalents
function normalizeString (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    const norm1 = newValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // the u0027 also normalizes the curly apostrophe to the straight one
    const norm2 = norm1.replace(/[\u2019]/g, '\u0027')
    // remove periods and other remaining special characters
    const norm3 = norm2.replace(/[&\/\\#,+()$~%.'":*?<>{}!-]/g,'');
    return removeSpaces(norm3)
  } else {
    return value
  }
}

// remove diacritic characters (used later for fuzzy matching of names)
function normalizeObjectProperties (object, properties) {
  const newObject = _.clone(object)
  _.each (properties, (property) => {
    newObject[property] = normalizeString(newObject[property])
  })
  return newObject
}

// replace diacritics with alphabetic character equivalents
function removeSpaces (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    let norm =  newValue.replace(/\s/g, '')
    // console.log(`before replace space: ${value} after replace space: ${norm}`)
    return norm
  } else {
    return value
  }
}

// remove diacritic characters (used later for fuzzy matching of names)
function removeSpacesObjectProperities (object, properties) {
  const newObject = _.clone(object)
  _.each (properties, (property) => {
    newObject[property] = removeSpaces(newObject[property])
  })
  return newObject
}

function createFuzzyIndex (testKeys, funderMap) {
  // first normalize the diacritics
  const testFunderMap = _.map(funderMap, (funder) => {
    return normalizeObjectProperties(funder, testKeys)
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
  // // first normalize the diacritics
  // const testFunderMap = _.map(funderMap, (funder) => {
  //    return normalizeObjectProperties(funder, [nameKey])
  // })
  // normalize last name checking against as well
  const testName = normalizeString(funderName)

  // let matchedFunders = []
  // _.each(funderMap, (funder) => {
  //   // console.log(`testing funder name: ${testName} against value: ${funder[nameKey]}`)
  //   if (_.toLower(testName)===_.toLower(funder[nameKey])){
  //     matchedFunders.push(funder)
  //   }
  // })
  // return matchedFunders
  // console.log(`After diacritic switch ${JSON.stringify(nameMap, null, 2)} converted to: ${JSON.stringify(testNameMap, null, 2)}`)
  // const funderFuzzy = new Fuse(testFunderMap, {
  //   caseSensitive: false,
  //   shouldSort: true,
  //   includeScore: false,
  //   keys: [nameKey],
  //   findAllMatches: false,
  //   tokenize: false,
  //   distance: 0,
  //   ignoreLocation: false,
  //   threshold: 0.0
  // });

  const funderResults = fuzzyIndex.search(testName)
  const reducedResults = _.map(funderResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  // console.log(`For testing: ${testLast} Last name results: ${JSON.stringify(lastNameResults, null, 2)}`)
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
      const testFunder = normalizeString(award['funder_name'])
      const matchedFunders = funderMatchFuzzy(testFunder, funderFuzzyIndex)
      // const matchedNameFunders = funderMatchFuzzy(testFunder, 'name', funderMap)
      // const matchedSubfunders = funderMatchFuzzy(testFunder, 'name', subfunderMap)
      // const matchedFunderVariances = funderMatchFuzzy(testFunder, 'name', funderVariancesMap)
      // const matchedSubfunderVariances = funderMatchFuzzy(testFunder, 'name', subfunderVariancesMap)
      console.log(`Matched funders: ${JSON.stringify(matchedFunders, null, 2)}`)
      // console.log(`Matched short name funders: ${JSON.stringify(matchedShortNameFunders, null, 2)}`)
      // console.log(`Matched subfunders: ${JSON.stringify(matchedSubfunders, null, 2)}`)
      // console.log(`Matched funder variances: ${JSON.stringify(matchedFunderVariances, null, 2)}`)
      // console.log(`Matched subfunder variances: ${JSON.stringify(matchedSubfunderVariances, null, 2)}`)
      let matchedInfo = {
        'award_id': award['id'],
        'funder_name': award['funder_name']
        // 'Matches': matchedFunders
      }
      // let matchedSubInfo = {
      //   'award_id': award['id'],
      //   'funder_name': award['funder_name'],
      //   'Matches': matchedSubfunders
      // }
      if (matchedFunders.length > 1) {
        // console.log('here')
        _.each(matchedFunders, (matched) => {
          // console.log(`Testing ${matched['title']} against ${testTitle}`)
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
        // console.log(`No Matched funders for award - ${award['id']}, funder - ${testFunder}: ${JSON.stringify(matchedFunders, null, 2)}`)
      } else {
        if (_.toLower(matchedFunders[0]['name']) === _.toLower(testFunder) ||
        _.toLower(matchedFunders[0]['short_name']) === _.toLower(testFunder)) {
          matchedInfo['Matches'] = matchedFunders
          singleMatches.push(matchedInfo)
        } else {
          zeroMatches.push(matchedInfo)
        }
        // singleMatches.push(`Matched journal for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedFunders, null, 2)}`)
      }
      // if (matchedSubfunders.length > 1) {
      //   // console.log('here')
      //   _.each(matchedSubfunders, (matched) => {
      //     // console.log(`Testing ${matched['title']} against ${testTitle}`)
      //     if (_.lowerCase(matched['name']) === _.lowerCase(testFunder)) {
      //       matchedSubInfo['Matches'] = [matched]
      //     }
      //   })
      //   if (matchedSubInfo['Matches'] && matchedSubInfo['Matches'].length === 1) {
      //     singleSubMatches.push(matchedSubInfo)
      //   } else {
      //     multipleSubMatches.push(matchedSubInfo)
      //   }
      // } else if (matchedSubfunders.length <= 0) {
      //   zeroSubMatches.push(matchedSubInfo)
      //   // zeroMatches.push(`No Matched journals for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedFunders, null, 2)}`)
      // } else {
      //   singleSubMatches.push(matchedSubInfo)
      //   // singleMatches.push(`Matched journal for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedFunders, null, 2)}`)
      // }
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

  // //insert single matches
  // let loopCounter = 0
  // await pMap(singleMatches, async (matched) => {
  //   loopCounter += 1
  //   await randomWait(loopCounter)
  //   console.log(`Updating funder of award ${loopCounter} ${matched['funder']}`)
  //   const resultUpdatePubJournal = await client.mutate(updatePubJournal(matched['doi'], matched['Matches'][0]['id']))
  //   // console.log(`Returned result journal: ${JSON.stringify(resultUpdatePubJournal.data.update_publications.returning, null, 2)}`)
  // }, {concurrency: 10})
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
