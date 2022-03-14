import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import readPublicationsFromStartYear from './gql/readPublicationsFromStartYear'
import readPublicationsYearNull from './gql/readPublicationsYearNull'
import updatePubYear from './gql/updatePubYear'
import updatePubMonth from './gql/updatePubMonth'
import updatePubDay from './gql/updatePubDay'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'
import { randomWait } from './units/randomWait'
import { command as writeCsv} from './units/writeCsv'
import DateHelper from './units/dateHelper'
import moment from 'moment'
import Csl from './modules/csl'
import CslDate from './modules/cslDate'

const Fuse = require('fuse.js')

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

async function getPublicationsNullYear () {
  const queryResult = await client.query(readPublicationsYearNull())
  return queryResult.data.publications
}

// function getUpdatedPublicationDate (csl) {
//   // look for both online and print dates, and make newer date win if different
//   // put in array sorted by date

//   let dates = []
//   const dateBases = [
//     'journal-issue.published-print.date-parts[0]',
//     'journal-issue.published-online.date-parts[0]',
//     'published.date-parts[0]',
//     'issued.date-parts[0]',
//     'published-print.date-parts[0]',
//     'published-online.date-parts[0]'
//   ]
//   _.each(dateBases, (dateBase) => {
//     const year = _.get(csl, `${dateBase}[0]`, null)
//     const month = _.get(csl, `${dateBase}[1]`, null)
//     const day = _.get(csl, `${dateBase}[2]`, null)
//     if (year !== null) {
//       const date = {
//         year: year,
//         month: (month !== null ? month : undefined),
//         day: (day !== null ? day : undefined)
//       }
//       dates.push(date)
//     }
//   })

//   // check graph nodes as well
//   const graphNodes = _.get(csl, '_graph', [])
//   if (graphNodes.length > 0) {
//     _.each(graphNodes, (node) => {
//       if (node['data'] && _.keys(node['data'].length > 0)) {
//         _.each(dateBases, (dateBase) => {
//           const year = _.get(csl, `${dateBase}[0]`, null)
//           const month = _.get(csl, `${dateBase}[1]`, null)
//           const day = _.get(csl, `${dateBase}[2]`, null)
//           if (year !== null) {
//             const date = {
//               year: year,
//               month: (month !== null ? month : undefined),
//               day: (day !== null ? day : undefined)
//             }
//             dates.push(date)
//           }
//         })
//       }
//     })
//   }

//   dates = _.sortBy(dates, (date) => { 
//     let year = date['year']
//     let month = (date['month'] ? date['month'] : 1)
//     let day = (date['day'] ? date['day'] : 1)
//     return DateHelper.getDateObject(`${year}-${month}-${day}`).getTime()
//   }).reverse()
//   if (dates.length > 0) {
//     // return the most recent year
//     return dates[0]
//   } else {
//     return null
//   }
// }

async function main (): Promise<void> {

  // default to startYear undefined to check all missing journals
  const startYear = 2020
  console.log(`Querying for publications >= ${startYear}...`)
  const publications = await getPublications(startYear)
  console.log(`Found ${publications.length} publications >= ${startYear}`)

  console.log(`Querying for publications NUll Year...`)
  const publicationsNullYear = await getPublicationsNullYear()
  console.log(`Found ${publicationsNullYear.length} publications Null Year`)

  const pubsNeedUpdateYear = []
  const pubsNeedUpdateMonth = []
  const pubsNeedUpdateDay = []

  const allPubs = _.concat(publications, publicationsNullYear)

  let pubCounter = 0
  console.log(`Checking publication dates for ${allPubs.length} >= ${startYear} and Null publications...`)
  let differentYearCount = 0
  let totalCount = 0
  let yearFoundCount = 0
  let monthFoundCount = 0
  let differentMonthCount = 0
  let dayFoundCount = 0
  let differentDayCount = 0
  let errorCount = 0
  let yearNaNCount = 0
  let monthNaNCount = 0
  let dayNaNCount = 0
  await pMap(allPubs, async (publication) => {
    pubCounter += 1
    const updatedPubDate: CslDate = Csl.getPublicationDate(publication['csl'])
    if (updatedPubDate !== null){
      totalCount += 1
      try {
        if (updatedPubDate.year){
          yearFoundCount += 1
          if (updatedPubDate.year !== Number.parseInt(publication['year'])){
            differentYearCount += 1
            pubsNeedUpdateYear.push({pub: publication, expectedPubYear: updatedPubDate.year})
          }
          if (updatedPubDate.month){
            monthFoundCount += 1
            if (updatedPubDate.month !== Number.parseInt(publication['month'])){
              differentMonthCount += 1
              pubsNeedUpdateMonth.push({pub: publication, expectedPubMonth: updatedPubDate.month})
            }
          }
          if (updatedPubDate.day){
            dayFoundCount += 1
            if (updatedPubDate.day !== Number.parseInt(publication['day'])){
              differentDayCount += 1
              pubsNeedUpdateDay.push({pub: publication, expectedPubDay: updatedPubDate.day})
            }
          } 
        } else {
          yearNaNCount += 1
        }
      } catch (error) {
        errorCount += 1
      }
    }
  }, {concurrency: 60})

  console.log(`Date counts...`)
  console.log(`Total Date Count: ${totalCount}`)
  console.log(`Different year count: ${differentYearCount}`)
  console.log(`Year found count: ${yearFoundCount}`)
  console.log(`Month found count: ${monthFoundCount}`)
  console.log(`Different month count: ${differentMonthCount}`)
  console.log(`Day found count: ${dayFoundCount}`)
  console.log(`Different day count: ${differentDayCount}`)
  console.log(`Not a number year count: ${yearNaNCount}`)
  console.log(`Not a number month count: ${monthNaNCount}`)
  console.log(`Not a number day count: ${dayNaNCount}`)
  console.log(`Error count: ${errorCount}`)

  console.log(`Found ${pubsNeedUpdateYear.length} of ${totalCount} publications with a year mismatch`)
  console.log(`Found ${pubsNeedUpdateMonth.length} of ${totalCount} publications with a month mismatch`)
  console.log(`Found ${pubsNeedUpdateDay.length} of ${totalCount} publications with a day mismatch`)
  console.log('Prepping to write to csv...')
  const yearData = _.map(pubsNeedUpdateYear, (needUpdate) => {
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

  const monthData = _.map(pubsNeedUpdateMonth, (needUpdate) => {
    const pub = needUpdate['pub']
    const expectedPubMonth = needUpdate['expectedPubMonth']
    return {
      id: pub['id'],
      title: pub['title'],
      foundMonth: pub['month'],
      expectedMonth: expectedPubMonth
      // csl: pub['csl_string']
    }
  })

  const dayData = _.map(pubsNeedUpdateDay, (needUpdate) => {
    const pub = needUpdate['pub']
    const expectedPubDay = needUpdate['expectedPubDay']
    return {
      id: pub['id'],
      title: pub['title'],
      foundDay: pub['day'],
      expectedDay: expectedPubDay
      // csl: pub['csl_string']
    }
  })

  console.log('Writing year data to csv...')
  await writeCsv({
    path: `../data/mismatch_publications_year_${moment().format('YYYYMMDDHHmmss')}.csv`,
    data: yearData
  })
  console.log('Writing month data to csv...')
  await writeCsv({
    path: `../data/mismatch_publications_month_${moment().format('YYYYMMDDHHmmss')}.csv`,
    data: monthData
  })
  console.log('Writing day data to csv...')
  await writeCsv({
    path: `../data/mismatch_publications_day_${moment().format('YYYYMMDDHHmmss')}.csv`,
    data: dayData
  })
  console.log('Done writing data to csv')

  console.log('Updating data in DB...')
  //insert single matches
  let loopCounter = 0
  console.log('Updating publication years...')
  await pMap(yearData, async (pub) => {
    loopCounter += 1
    await randomWait(loopCounter)
    console.log(`Updating pub ${pub['id']} year: ${pub['expectedYear']}...`)
    const resultUpdatePub = await client.mutate(updatePubYear(pub['id'], pub['expectedYear']))
  }, {concurrency: 10})
  console.log('Updating publication months...')
  await pMap(monthData, async (pub) => {
    loopCounter += 1
    await randomWait(loopCounter)
    console.log(`Updating pub ${pub['id']} month: ${pub['expectedMonth']}...`)
    const resultUpdatePub = await client.mutate(updatePubMonth(pub['id'], pub['expectedMonth']))
  }, {concurrency: 10})
  console.log('Updating publication days...')
  await pMap(dayData, async (pub) => {
    loopCounter += 1
    await randomWait(loopCounter)
    console.log(`Updating pub ${pub['id']} day: ${pub['expectedDay']}...`)
    const resultUpdatePub = await client.mutate(updatePubDay(pub['id'], pub['expectedDay']))
  }, {concurrency: 10})
  console.log('Done Updating data in DB.')
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
