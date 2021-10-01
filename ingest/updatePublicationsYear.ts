import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import readPublicationsFromStartYear from './gql/readPublicationsFromStartYear'
import updatePubYear from './gql/updatePubYear'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'
import { randomWait } from './units/randomWait'
import { command as writeCsv} from './units/writeCsv'
const Fuse = require('fuse.js')

import { removeSpaces, normalizeString, normalizeObjectProperties } from './units/normalizer'


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


async function getPublications (startYear) {
  const queryResult = await client.query(readPublicationsFromStartYear(startYear))
  return queryResult.data.publications
}

function getUpdatedPublicationYear (csl) {
  // look for both online and print dates, and make newer date win if different
  // put in array sorted by date

  let years = []
  years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
  years.push(_.get(csl, 'issued.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-online.date-parts[0][0]', null))

  years = _.sortBy(years, (year) => { return year === null ? 99999999 : Number.parseInt(year) }) // .reverse()
  if (years.length > 0 && years[0] > 0) {
    // return the most recent year
    return years[0]
  } else {
    return null
  }
}

async function main (): Promise<void> {

  // default to startYear undefined to check all missing journals
  const startYear = 2020
  console.log(`Querying for publications >= ${startYear}...`)
  const publications = await getPublications(startYear)
  console.log(`Found ${publications.length} publications >= ${startYear}`)

  const pubsNeedingUpdate = []

  let pubCounter = 0
  console.log(`Checking publication years for ${publications.length} >= ${startYear}...`)
  await pMap(publications, async (publication) => {
    pubCounter += 1
    const updatedPubYear = getUpdatedPublicationYear(publication['csl'])
    if (updatedPubYear !== null && Number.parseInt(`${publication['year']}`) !== Number.parseInt(`${updatedPubYear}`)) {
      console.log(`Pub year mismatch title: ${publication['title']} Found: ${publication['year']} Expected: ${updatedPubYear}`)
      pubsNeedingUpdate.push({pub: publication, expectedPubYear: updatedPubYear})
    }
  }, {concurrency: 60})

  console.log(`Found ${pubsNeedingUpdate.length} publications with a mismatch`)
  console.log('Prepping to write to csv...')
  const data = _.map(pubsNeedingUpdate, (needUpdate) => {
    const pub = needUpdate['pub']
    const expectedPubYear = needUpdate['expectedPubYear']
    return {
      id: pub['id'],
      title: pub['title'],
      foundYear: pub['year'],
      expectedYear: expectedPubYear
      // csl: pub['csl_string']
    }
  })

  console.log('Writing data to csv...')
  await writeCsv({
    path: '../data/mismatch_publications.csv',
    data: data
  })
  console.log('Done writing data to csv')

  console.log('Updating data in DB...')
  //insert single matches
  let loopCounter = 0
  await pMap(data, async (pub) => {
    loopCounter += 1
    await randomWait(loopCounter)
    console.log(`Updating pub ${pub['id']} year: ${pub['expectedYear']}...`)
    const resultUpdatePub = await client.mutate(updatePubYear(pub['id'], pub['expectedYear']))
  }, {concurrency: 10})
  console.log('Done Updating data in DB.')
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
