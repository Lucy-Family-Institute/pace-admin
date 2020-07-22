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
import insertFunderNameVariances from './gql/insertFunderNameVariances'
import insertSubfunderNameVariances from './gql/insertSubfunderNameVariances'
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

function createSubfunderNameVarianceObjects (newSubfundersFromCSV, existingSubfundersByShortName) {
  let newFunderNamevariances = []
  _.each(newSubfundersFromCSV, (subfunder) => {
    // console.log(`Creating name variances for ${JSON.stringify(subfunder, null, 2)}`)
    // only add if the funder already exists in DB
    if (subfunder['parent_short_name'] &&
    subfunder['short_name'] &&
    existingSubfundersByShortName[subfunder['parent_short_name']] &&
    existingSubfundersByShortName[subfunder['parent_short_name']][subfunder['short_name']]){
      const existingSubfunder = existingSubfundersByShortName[subfunder['parent_short_name']][subfunder['short_name']]
      // console.log(`Existing subfunder is: ${JSON.stringify(existingSubfunder, null, 2)}`)
      newFunderNamevariances = _.concat(newFunderNamevariances, createSubfunderNameVarianceObject(subfunder['name_variances'], existingSubfunder.id))
    }
  })
  return newFunderNamevariances
}

function createFunderNameVarianceObjects (newFundersFromCSV, existingFundersByShortName) {
  let newFunderNamevariances = []
  _.each(newFundersFromCSV, (funder) => {
    // only add if the funder already exists in DB
    if (funder['short_name'] && existingFundersByShortName[funder['short_name']]){
      const existingFunder = existingFundersByShortName[funder['short_name']]
      newFunderNamevariances = _.concat(newFunderNamevariances, createFunderNameVarianceObject(funder['name_variances'], existingFunder.id))
    }
  })
  return newFunderNamevariances
}

function createFunderNameVarianceObject (nameVariances, funderId) {
  let newNameVariances = []
  _.each(nameVariances.split(';'), (variance) => {
    const newVariant = variance.trim()
    if (newVariant!=='') {
      let obj = {
        name: newVariant,
        funder_id: funderId
      }
      newNameVariances.push(obj)
    }
  })
  return newNameVariances
}

function createSubfunderNameVarianceObject (nameVariances, subfunderId) {
  let newNameVariances = []
  _.each(nameVariances.split(';'), (variance) => {
    const newVariant = variance.trim()
    if (newVariant!=='') {
      let obj = {
        name: newVariant,
        subfunder_id: subfunderId
      }
      newNameVariances.push(obj)
    }
  })
  return newNameVariances
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
  // console.log(`Creating subfunder objects`)
  _.each(subfundersFromCSV, (subfunder) => {
    if (existingFundersByShortName[subfunder['parent_short_name']]){
      let obj = {
        name: subfunder[_.keys(subfunder)[0]],
        short_name: subfunder['short_name'],
        funder_id: existingFundersByShortName[subfunder['parent_short_name']]['id']
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

  // console.log(`New Funders loaded are: ${JSON.stringify(newFunders, null, 2)}`)

  const newSubfunders = _.filter(funderByType['subfunder'], (subfunder) => {
    // include subfunders that do not already exist in DB
    const parentShortName = subfunder['parent_short_name']
    const shortName = subfunder['short_name']
    if (parentShortName && shortName && existingSubfundersByShortName[parentShortName]) {
      return !existingSubfundersByShortName[parentShortName][shortName]
    }
    return true
  })

  // console.log(`New Subfunders loaded are: ${JSON.stringify(newSubfunders, null, 2)}`)

  // prep funder, subfunders, and their name variances for insert into the DB
  const newFundersToInsert = createFunderObjects(newFunders)
  // console.log(`New Funders prepped for insert are: ${JSON.stringify(newFundersToInsert, null, 2)}`)

  const resultInsertFunders = await client.mutate(insertFunder(newFundersToInsert))
  // add new funders to the existing funders map
  existingFundersByShortName = _.merge(existingFundersByShortName, getFundersByShortName(resultInsertFunders.data.insert_funders.returning, 'short_name'))
  console.log(`Inserted ${resultInsertFunders.data.insert_funders.returning.length} total funders, now ${_.keys(existingFundersByShortName).length} total funders`)

  const newSubfundersToInsert = createSubfunderObjects(newSubfunders, existingFundersByShortName)
  // console.log(`Prepped new subfunders for insert: ${JSON.stringify(newSubfundersToInsert, null, 2)}`)
  const resultInsertSubfunders = await client.mutate(insertSubfunder(newSubfundersToInsert))
  // merge in the newly inserted subfunders
  const insertedSubfunders = resultInsertSubfunders.data.insert_subfunders.returning
  _.each(insertedSubfunders, (inserted) => {
    const parentShortName = inserted.funder.short_name
    if (!existingSubfundersByShortName[parentShortName]) {
      existingSubfundersByShortName[parentShortName] = {}
    }
    existingSubfundersByShortName[parentShortName][inserted.short_name] = inserted
  })
  // console.log(`After insert existing subfunders are: ${JSON.stringify(existingSubfundersByShortName, null, 2)}`)
  console.log(`Inserted ${resultInsertSubfunders.data.insert_subfunders.returning.length} total subfunders`)

  const newFunderNameVariancesToInsert = createFunderNameVarianceObjects(newFunders, existingFundersByShortName)
  // console.log(`Prepped new funder name variances for insert: ${JSON.stringify(newFunderNameVariancesToInsert, null, 2)}`)
  const resultInsertFunderVariances = await client.mutate(insertFunderNameVariances(newFunderNameVariancesToInsert))
  console.log(`Inserted ${resultInsertFunderVariances.data.insert_funders_namevariances.returning.length} funder name variances`)

  const newSubfunderNameVariancesToInsert = createSubfunderNameVarianceObjects(newSubfunders, existingSubfundersByShortName)
  // console.log(`Prepped new subfunder name variances for insert: ${JSON.stringify(newSubfunderNameVariancesToInsert, null, 2)}`)
  const resultInsertSubfunderVariances = await client.mutate(insertSubfunderNameVariances(newSubfunderNameVariancesToInsert))
  console.log(`Inserted ${resultInsertSubfunderVariances.data.insert_subfunders_namevariances.returning.length} subfunder name variances`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
