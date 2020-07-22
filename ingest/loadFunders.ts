import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readFunders from './gql/readFunders'
import insertFunder from './gql/insertFunder'
import insertSubfunder from './gql/insertSubfunder'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

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

async function wait(ms){
  return new Promise((resolve, reject)=> {
    setTimeout(() => resolve(true), ms );
  });
}

async function randomWait(seedTime, index){
  const waitTime = 1000 * (index % 5)
  //console.log(`Thread Waiting for ${waitTime} ms`)
  await wait(waitTime)
}

function createNameVarianceObjects(nameVariances) {
  let newVariances = []
  _.each(nameVariances.split(';'), (variance) => {
    let obj = {
      name: variance
    }
    newVariances.push(obj)
  })
  return newVariances
}

function createFunderObject(funderName, shortName) {
  return {
    name: funderName,
    short_name: shortName
  }
}

function createFunderObjects(fundersFromCSV) {
  let newFunders = []
  _.each(fundersFromCSV, (funder) => {
    newFunders.push(createFunderObject(funder[_.keys(funder)[0]], funder.short_name))
  })
  return newFunders
}

function createSubfunderObjects(subfundersFromCSV, existingFundersByShortName) {
  let newSubfunders = []
  _.each(subfundersFromCSV, (subfunder) => {
    if (existingFundersByShortName[subfunder['parent_short_name']]){
      let obj = {
        name: subfunder[_.keys(subfunder)[0]],
        short_name: subfunder['short_name'],
        funder_id: existingFundersByShortName[subfunder['parent_short_name']].id
      }
      newSubfunders.push(obj)
    }
  })
  return newSubfunders
}

async function getFunders () {
  const queryResult = await client.query(readFunders())
  return queryResult.data.funders
}

function getFundersByShortName (funders, shortNameKey) {
  return _.mapKeys(funders, (funder) => {
    if (!shortNameKey) {
      shortNameKey = 'short_name'
    }
    return funder[shortNameKey]
  })
}

async function main (): Promise<void> {

  //get existing funders and subfunders
  const existingFunders = await getFunders()
  //get funders mapped funder_short_name => funder
  let existingFundersByShortName = getFundersByShortName(existingFunders, 'short_name')

  //get subfunders mapped funder_short_name => subfunder_short_name => subfunder
  let existingSubfundersByShortName = _.mapValues(existingFundersByShortName, (funder) => {
    return getFundersByShortName(funder.subfunders, 'short_name')
  })

  const fundersFromCSV: any = await loadCsv({
    path: '../data/funders.csv'
  })

  // group by funders and subfunders
  const funderByType = await _.groupBy(fundersFromCSV, (funder) => {
    if (funder.parent_short_name) {
      return 'subfunder'
    } else {
      return 'funder'
    }
  })

  console.log(`Funders loaded are: ${JSON.stringify(funderByType, null, 2)}`)

  const newFunders = _.filter(funderByType['funder'], (funder) => {
    // filter out funders that already exist in DB
    return !existingFundersByShortName[funder['short_name']]
  })

  console.log(`New Funders loaded are: ${JSON.stringify(newFunders, null, 2)}`)

  const newSubfunders = _.filter(funderByType['subfunder'], (subfunder) => {
    // include subfunders that do not already exist in DB
    const parentShortName = subfunder['parent_short_name']
    const shortName = subfunder['short_name']
    if (parentShortName && shortName && existingSubfundersByShortName[parentShortName]) {
      return !existingSubfundersByShortName[parentShortName][shortName]
    }
    return true
  })

  console.log(`New Subfunders loaded are: ${JSON.stringify(newSubfunders, null, 2)}`)

  // prep funder, subfunders, and their name variances for insert into the DB
  const newFundersToInsert = createFunderObjects(newFunders)
  console.log(`New Funders prepped for insert are: ${JSON.stringify(newFundersToInsert, null, 2)}`)

  const resultInsertFunders = await client.mutate(insertFunder(newFundersToInsert))
  // add new funders to the existing funders map
  existingFundersByShortName = _.merge(existingFundersByShortName, getFundersByShortName(resultInsertFunders.data.insert_funders.returning, 'short_name'))
  console.log(`Inserted ${resultInsertFunders.data.insert_funders.returning.length} total funders existing funders now: ${_.keys(existingFundersByShortName).length}`)

  const newSubfundersToInsert = createSubfunderObjects(newSubfunders, existingFundersByShortName)
  const resultInsertSubfunders = await client.mutate(insertSubfunder(newSubfundersToInsert))
  console.log(`Inserted ${resultInsertSubfunders.data.insert_subfunders.returning.length} total subfunders`)

  // // console.log(`Inserted ${resultInsertPubAward.data.insert_awards.returning.length} total awards`)
  // let newFunderNamevariances = []
  // _.each(newFunders, (funder) => {
  //   newFunderNamevariances = _.concat(newFunderNamevariances, createNameVarianceObjects(funder))
  // })
  // let newSubfunderNamevariances = []
  // _.each(newSubfunders, (subfunder) => {
  //   newSubfunderNamevariances = _.concat(newSubfunderNamevariances, createNameVarianceObjects(subfunder))
  // })
  
  // console.log(`Funders loaded are: ${JSON.stringify(funderByType, null, 2)}`)

  // const publications = await getPublications()
  // const awardsByPubIdBySource = await getAwardsByPubIdBySource(publications)

  // // get new awards to insert later
  // let newAwardsToInsert = []
  // _.each(publications, (publication) => {
  //   // add any missing crossref awards
  //   newAwardsToInsert = _.concat(newAwardsToInsert, getNewAwardsFromCrossref(awardsByPubIdBySource, publication))
  //   newAwardsToInsert = _.concat(newAwardsToInsert, getNewAwardsFromPubmed(awardsByPubIdBySource, publication))
  // })

  // // console.log(`New awards to insert are: ${JSON.stringify(newAwardsToInsert, null, 2)}`)
  // // now insert the awards in a batch
  // const resultInsertPubAward = await client.mutate(insertPubAward(newAwardsToInsert))
  // console.log(`Inserted ${resultInsertPubAward.data.insert_awards.returning.length} total awards`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
