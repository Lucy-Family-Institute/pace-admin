import _, { padStart } from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import moment from 'moment'
import dotenv from 'dotenv'
import { randomWait, wait } from './units/randomWait'

import readPersonPublicationsConfSetsBySource from './gql/readPersonPublicationsConfSetsBySource'
// import { Harvester, HarvestOperation } from './modules/harvester'
import { SemanticScholarDataSource } from './modules/semanticScholarDataSource'
// import { getAllNormedPersonsByYear } from '../ingest/modules/queryNormalizedPeople'
// import NormedPerson from './modules/normedPerson'
// import { getDateObject } from './units/dateRange'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'
import { CalculateConfidence } from './modules/calculateConfidence'
import { command as writeCsv} from './units/writeCsv'

const nameParser = require('./units/nameParser').command;
const calculateConfidence: CalculateConfidence = new CalculateConfidence()

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('../config/config.js');

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

async function getSemanticScholarPersonPublicationsConfSets() {
  const result = await client.query(readPersonPublicationsConfSetsBySource('SemanticScholar'))
  console.log(`Result keys: ${_.keys(result.data)}`)
  return result.data.confidencesets_persons_publications
}

function getSearchAuthorMap(authorList) {
  const authorMap = _.transform(authorList, function (result, value) {
    const lastName = _.toLower(value['family_name'])
    return (result[lastName] || (result[lastName] = [])).push(value)
  }, {})
}

function getPersonPubLastNameVariances (personPub) {
  let lastNames = _.map(personPub.person.persons_namevariances, (name) => {
    return name.family_name
  })
  lastNames.push(personPub.person.family_name)
  return lastNames
}

function getSimplifiedPerson (personPub) {
  const names = []
  
  const person = personPub.person
  names.push({
    lastName: person.family_name.toLowerCase(),
    firstInitial: person.given_name[0].toLowerCase(),
    firstName: person.given_name.toLowerCase(),
  })

  // add all name variations
  if (person.persons_namevariances) {
    _.each (person.persons_namevariances, (nameVariance) => {
      names.push({
        lastName: nameVariance.family_name.toLowerCase(),
        firstInitial: (nameVariance.given_name ? nameVariance.given_name[0].toLowerCase() : ''),
        firstName: (nameVariance.given_name ? nameVariance.given_name.toLowerCase() : '')
      })
    })
  }
  
  return {
    id: person.id,
    names: names,
    startYear: person.start_date,
    endYear: person.end_date
  }
}

async function matchAuthors (personPub, searchAuthorMap, sourceName, confidenceTypesByRank, minConfidence) {
  // console.log(`Testing pub w author: ${JSON.stringify(author, null, 2)}`)
  //check for any matches of last name
  // get array of author last names
  // const lastNames = getPersonPubLastNameVariances(personPub)
  // console.log(`Publication author map is: ${JSON.stringify(publicationAuthorMap, null, 2)}`)
  // console.log(`last names are: ${JSON.stringify(lastNames, null, 2)}`)
  let matchedAuthors = {}
  const testAuthor = getSimplifiedPerson(personPub)
  await pMap (_.keys(searchAuthorMap), async (pubLastName) => {
      let objMap = {}
      objMap[pubLastName] = [searchAuthorMap[pubLastName]]
      const passedConfidenceTests = await calculateConfidence.performAuthorConfidenceTests (testAuthor, undefined, [], confidenceTypesByRank, sourceName, personPub['publication']['source_metadata'], objMap)
      // returns a new map of rank -> confidenceTestName -> calculatedValue
      const passedConfidenceTestsWithConf = await calculateConfidence.calculateAuthorConfidence(passedConfidenceTests)
      // returns a new map of rank -> confidenceTestName -> calculatedValue
      // calculate overall total and write the confidence set and comments to the DB
      // calculate overall total and write the confidence set and comments to the DB
      let confidenceTotal = 0.0
      _.mapValues(passedConfidenceTestsWithConf, (confidenceTests, rank) => {
        _.mapValues(confidenceTests, (confidenceTest) => {
          confidenceTotal += confidenceTest['confidenceValue']
        })
      })
      // set ceiling to 99%
      if (confidenceTotal >= 1.0) confidenceTotal = 0.99
      // have to do some weird conversion stuff to keep the decimals correct
      confidenceTotal = Number.parseFloat(confidenceTotal.toFixed(3))

      if (!matchedAuthors[pubLastName]) {
        matchedAuthors[pubLastName] = []
      }
      // console.log(`Passed conf tests: ${JSON.stringify(passedConfidenceTests, null, 2)}`)
      console.log(`confidence total is: ${confidenceTotal}`)
      let highestRank = 0
      if (confidenceTotal >= minConfidence) {
        _.each (_.keys(passedConfidenceTests), (rank) => {
          const numRank = Number.parseInt(rank)
          _.each(_.keys(passedConfidenceTests[rank]), (test) => {
            // console.log(`Matched set: ${JSON.stringify(passedConfidenceTests[rank][test]['matchedAuthors'], null, 2)}`)
            _.each(_.keys(passedConfidenceTests[rank][test]['matchedAuthors']), (set) => {
              // console.log(`Matched set value: ${JSON.stringify(passedConfidenceTests[rank][test]['matchedAuthors'][set], null, 2)}`)
              if (numRank >= highestRank) {
                matchedAuthors[pubLastName] = passedConfidenceTests[rank][test]['matchedAuthors'][set]
              }
            })
          })
        })
      } else {
        console.log(`Skipping add author with confidence rating ${confidenceTotal}`)
      }
      // // console.log(`Testing lastname: ${lastName}, searchAuthor: ${JSON.stringify(searchAuthorMap[pubLastName], null, 2)}`)
      // if (calculateConfidence.lastNameMatchFuzzy(lastName, 'family_name', {pubLastName: searchAuthorMap[pubLastName]})) {
      //   matchedAuthors[pubLastName] = searchAuthorMap[pubLastName]
      //   return false
      // }
    //})
  }, { concurrency: 1 })
  // console.log(`Matched authors are: ${JSON.stringify(matchedAuthors, null, 2)}`)
  return matchedAuthors
}

async function main (): Promise<void> {

  const dsConfig: DataSourceConfig = {
    baseUrl: 'https://api.semanticscholar.org/v1/',
    authorUrl: 'https://api.semanticscholar.org/v1/author/',
    queryUrl: 'https://api.semanticscholar.org/v1/',
    publicationUrl: 'https://api.semanticscholar.org/v1/paper/',
    sourceName: 'SemanticScholar',
    pageSize: '100',  // page size must be a string for the request to work
    requestInterval: 3500
}
  const semanticDS = new SemanticScholarDataSource(dsConfig)

  const currentPersonPubConfSets = await getSemanticScholarPersonPublicationsConfSets()
  const confidenceTypesByRank = await calculateConfidence.getConfidenceTypesByRank()


  // console.log(`person pub conf sets found: ${currentPersonPubConfSets.length}`)
  const personPubConfSetsByDoi = _.groupBy(currentPersonPubConfSets, (personPub) => {
    return personPub.doi
  })

  const minConfidence = 0.50

  const authorListByDoi = {}
  await pMap(_.keys(personPubConfSetsByDoi), async (doi) => {
    const personPubConf = personPubConfSetsByDoi[doi][0]
    authorListByDoi[doi] = {}
    const sourceMetadata = personPubConf.publication.source_metadata
    // console.log(`Source Metadata is: ${JSON.stringify(_.keys(sourceMetadata), null, 2)}`)
    await pMap(semanticDS.getCoauthors(sourceMetadata), async (author) => {
      // console.log(`Author is: ${JSON.stringify(author, null, 2)}`)
      const parsedName = await nameParser({
        name: author['name'],
        reduceMethod: 'majority',
      });
      // console.log(`Parsed name is: ${JSON.stringify(parsedName, null, 2)}`)
      authorListByDoi[doi][parsedName.last] = {
        family: parsedName.last,
        given: parsedName.first,
        authorId: author['authorId'],
        name: author['name'],
        url: author['url']
      }   
    }, { concurrency: 1})
  }, { concurrency: 1 })

  const matchedAuthorRows = []
  await pMap(currentPersonPubConfSets, async (personPub) => {
    const matchedAuthors = await matchAuthors(personPub, authorListByDoi[personPub['doi']], dsConfig.sourceName, confidenceTypesByRank, minConfidence)
    _.each(_.values(matchedAuthors), (matchedAuthorArray: []) => {
      _.each(matchedAuthorArray, (matchedAuthor) => {
        if (personPub['value'] >= minConfidence){
          matchedAuthorRows.push({
            doi: personPub['doi'],
            person_id: personPub['person_id'],
            person_family_name: personPub['person'].family_name,
            person_given_name: personPub['person'].given_name,
            confidence: personPub['value'],
            matched_author_family_name: matchedAuthor['family'],
            matched_author_given_name: matchedAuthor['given'],
            matched_author_author_id: matchedAuthor['authorId'],
            matched_author_name: matchedAuthor['name'],
            matched_author_url: matchedAuthor['url']
          })
        }
      })
    })
    // console.log(`Matched authors for pub doi: ${personPub.doi} person id: ${personPub.person_id}, ${JSON.stringify(matchedAuthors, null, 2)}, authorList: ${JSON.stringify(authorListByDoi[personPub.doi], null, 2)}`)
  }, { concurrency: 1})
  
  // console.log(`Matched Authors overall: ${JSON.stringify(matchedAuthorRows, null, 2)}`)
  const filePath = `../data/mined_semantic_scholar_ids.${moment().format('YYYYMMDDHHmmss')}.csv`
  console.log(`Write authors found to csv ${filePath}...`)

  //write data out to csv
  await writeCsv({
    path: filePath,
    data: matchedAuthorRows
  });

  console.log(`Done writing authors found to csv ${filePath}...`)
}

main();
