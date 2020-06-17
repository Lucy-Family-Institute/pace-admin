import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readJournals from './gql/readJournals'
import readPublications from './gql/readPublications'
import updatePubJournal from './gql/updatePubJournal'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'
const Fuse = require('fuse.js')


dotenv.config({
  path: '../.env'
})

const axios = require('axios');

const elsApiKey = process.env.SCOPUS_API_KEY
const elsCookie = process.env.SCOPUS_API_COOKIE
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
    const norm3 = norm2.replace(/[&\/\\#,+()$~%.'":*?<>{}!]/g,'');
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

function journalMatchFuzzy (journalTitle, titleKey, journalMap){
  // first normalize the diacritics
  const testJournalMap = _.map(journalMap, (journal) => {
     return normalizeObjectProperties(journal, [titleKey])
  })
  // normalize last name checking against as well
  const testTitle = normalizeString(journalTitle)
  // console.log(`After diacritic switch ${JSON.stringify(nameMap, null, 2)} converted to: ${JSON.stringify(testNameMap, null, 2)}`)
  const lastFuzzy = new Fuse(journalMap, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: [titleKey],
    findAllMatches: true,
    threshold: 0.001,
  });

  const journalResults = lastFuzzy.search(testTitle)
  const reducedResults = _.map(journalResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  // console.log(`For testing: ${testLast} Last name results: ${JSON.stringify(lastNameResults, null, 2)}`)
  return reducedResults
}

async function getPublications () {
  const queryResult = await client.query(readPublications())
  return queryResult.data.publications
}

async function getJournals () {
  const queryResult = await client.query(readJournals())
  return queryResult.data.journals
}

async function main (): Promise<void> {

  const publications = await getPublications()
  const journals = await getJournals()

  // first normalize the diacritics
  const journalMap = _.map(journals, (journal) => {
    return normalizeObjectProperties(journal, ['title'])
  })

  const multipleMatches = []
  const zeroMatches = []
  const singleMatches = []

  const subset = _.chunk(publications, 1)

  let pubCounter = 0
  await pMap(publications, async (publication) => {
    pubCounter += 1
    // normalize last name checking against as well
    console.log(`${pubCounter} - Checking publication id: ${publication['id']}`)
    let matchedJournal = undefined
    if (publication['journal_title']) {
      const testTitle = normalizeString(publication['journal_title'])
      const matchedJournals = journalMatchFuzzy(testTitle, 'title', journalMap)
      let matchedInfo = {
        'doi': publication['doi'],
        'Article': publication['title'],
        'Journal_Text': publication['journal_title'],
        'Matches': matchedJournals
      }
      if (matchedJournals.length > 1) {
        // console.log('here')
        _.each(matchedJournals, (matched) => {
          // console.log(`Testing ${matched['title']} against ${testTitle}`)
          if (_.lowerCase(matched['title']) === _.lowerCase(testTitle)) {
            matchedInfo['Matches'] = [matched]
          }
        })
        if (matchedInfo['Matches'] && matchedInfo['Matches'].length === 1) {
          singleMatches.push(matchedInfo)
        } else {
          multipleMatches.push(matchedInfo)
        }
      } else if (matchedJournals.length <= 0) {
        zeroMatches.push(matchedInfo)
        // zeroMatches.push(`No Matched journals for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedJournals, null, 2)}`)
      } else {
        singleMatches.push(matchedInfo)
        // singleMatches.push(`Matched journal for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedJournals, null, 2)}`)
      }
    }
  }, {concurrency: 30})
 
  console.log(`Multiple Matches: ${JSON.stringify(multipleMatches, null, 2)}`)
  console.log(`Multiple Matches Count: ${multipleMatches.length}`)
  console.log(`No Matches Count: ${zeroMatches.length}`)
  console.log(`Single Matches Count: ${singleMatches.length}`)
 
  //insert single matches
  let loopCounter = 0
  await pMap(singleMatches, async (matched) => {
    loopCounter += 1
    await randomWait(1000, loopCounter)
    console.log(`Updating journal of pub ${loopCounter} ${matched['Article']}`)
    const resultUpdatePubJournal = await client.mutate(updatePubJournal(matched['doi'], matched['Matches'][0]['id']))
    // console.log(`Returned result journal: ${JSON.stringify(resultUpdatePubJournal.data.update_publications.returning, null, 2)}`)
  }, {concurrency: 10})
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
