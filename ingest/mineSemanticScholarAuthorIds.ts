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
import { SemanticScholarDataSource } from './modules/semanticScholarDataSource'

import DataSourceConfig from '../ingest/modules/dataSourceConfig'
import { CalculateConfidence } from './modules/calculateConfidence'
import { command as writeCsv} from './units/writeCsv'
import readPublicationsByPersonByConfidence from '../client/src/gql/readPublicationsByPersonByConfidence'

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
  return result.data.confidencesets_persons_publications
}

function getSearchAuthorMap(authorList) {
  const authorMap = _.transform(authorList, function (result, value) {
    const lastName = _.toLower(value['family_name'])
    return (result[lastName] || (result[lastName] = [])).push(value)
  }, {})
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
  let matchedAuthors = {}
  const testAuthor = getSimplifiedPerson(personPub)
  await pMap (_.keys(searchAuthorMap), async (pubLastName) => {
    let objMap = {}
    objMap[pubLastName] = [searchAuthorMap[pubLastName]]
    const passedConfidenceTests = await calculateConfidence.performAuthorConfidenceTests (testAuthor, undefined, [], confidenceTypesByRank, sourceName, personPub['publication']['source_metadata'], objMap)
    // returns a new map of rank -> confidenceTestName -> calculatedValue
    const passedConfidenceTestsWithConf = await calculateConfidence.calculateAuthorConfidence(passedConfidenceTests)
    // returns a new map of rank -> confidenceTestName -> calculatedValue
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
    // console.log(`confidence total is: ${confidenceTotal}`)
    let highestRank = 0
    if (confidenceTotal >= minConfidence) {
      _.each (_.keys(passedConfidenceTests), (rank) => {
        const numRank = Number.parseInt(rank)
        _.each(_.keys(passedConfidenceTests[rank]), (test) => {
          // console.log(`Matched set: ${JSON.stringify(passedConfidenceTests[rank][test]['matchedAuthors'], null, 2)}`)
          _.each(_.keys(passedConfidenceTests[rank][test]['matchedAuthors']), (set) => {
            // console.log(`Matched set value: ${JSON.stringify(passedConfidenceTests[rank][test]['matchedAuthors'][set], null, 2)}`)
            if (numRank >= highestRank) {
              matchedAuthors[pubLastName] = { 
                confidence: confidenceTotal, 
                matchedAuthors: passedConfidenceTests[rank][test]['matchedAuthors'][set]
              }
            }
          })
        })
      })
    } else {
      // console.log(`Skipping add author with confidence rating ${confidenceTotal}`)
    }
  }, { concurrency: 1 })
  // console.log(`Matched authors are: ${JSON.stringify(matchedAuthors, null, 2)}`)
  return matchedAuthors
}

async function main (): Promise<void> {

  const skipExistingIds = true
  const getFlatMatches = true
  const minConfidence = 0.3

  const dsConfig: DataSourceConfig = {
    baseUrl: process.env.SEMANTIC_SCHOLAR_BASE_URL,
    authorUrl: process.env.SEMANTIC_SCHOLAR_AUTHOR_URL,
    queryUrl: process.env.SEMANTIC_SCHOLAR_QUERY_URL,
    publicationUrl: process.env.SEMANTIC_SCHOLAR_PUBLICATION_URL,
    sourceName: process.env.SEMANTIC_SCHOLAR_SOURCE_NAME,
    pageSize: process.env.SEMANTIC_SCHOLAR_PAGE_SIZE,  // page size must be a string for the request to work
    requestInterval: Number.parseInt(process.env.SEMANTIC_SCHOLAR_REQUEST_INTERVAL)
  }
  const semanticDS = new SemanticScholarDataSource(dsConfig)

  const currentPersonPubConfSets = await getSemanticScholarPersonPublicationsConfSets()
  const confidenceTypesByRank = await calculateConfidence.getConfidenceTypesByRank()


  const existingSemanticIds = {}
  // console.log(`person pub conf sets found: ${currentPersonPubConfSets.length}`)
  const personPubConfSetsByDoi = _.groupBy(currentPersonPubConfSets, (personPub) => {
    // also populate set of known person id's too
    if (!existingSemanticIds[personPub.person_id]){
      existingSemanticIds[personPub.person_id] = []
    }
    if (personPub.person.semantic_scholar_id) {
      existingSemanticIds[personPub.person_id].push(personPub.person.semantic_scholar_id)
    }
    // now return doi to group by them
    return personPub.doi
  })

  console.log(`Existing Semantic ids are: ${JSON.stringify(existingSemanticIds, null, 2)}`)
  console.log(`Skipping author id matches of less than ${minConfidence}...`)

  const authorListByDoi = {}
  await pMap(_.keys(personPubConfSetsByDoi), async (doi) => {
    const personPubConf = personPubConfSetsByDoi[doi][0]
    authorListByDoi[doi] = {}
    const sourceMetadata = personPubConf.publication.source_metadata
    await pMap(semanticDS.getCoauthors(sourceMetadata), async (author) => {
      const parsedName = await nameParser({
        name: author['name'],
        reduceMethod: 'majority',
      });
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
  const highestConfidenceAuthorIdByPersonId = {}
  const flatMatchesByAuthorId = {}
  await pMap(currentPersonPubConfSets, async (personPub) => {
    const matchedAuthors = await matchAuthors(personPub, authorListByDoi[personPub['doi']], dsConfig.sourceName, confidenceTypesByRank, minConfidence)
    _.each(_.values(matchedAuthors), (matchedAuthorObject) => {
      const matchedAuthorArray = matchedAuthorObject['matchedAuthors']
      const confidence = matchedAuthorObject['confidence']
      _.each(matchedAuthorArray, (matchedAuthor) => {
        if (personPub['value'] >= minConfidence){
          const personId = personPub['person_id']

          const currentAuthorId = (matchedAuthor && matchedAuthor['authorId'] ? Number.parseInt(matchedAuthor['authorId']) : undefined)
          if (!skipExistingIds || !existingSemanticIds[personId] || !_.includes(existingSemanticIds[personId], currentAuthorId)){
            const matchedItem = {
              confidence: confidence,
              matchedAuthor: matchedAuthor,
              personPub: personPub
            }
            if (!highestConfidenceAuthorIdByPersonId[personId] ||
              confidence > highestConfidenceAuthorIdByPersonId[personId]['confidence']){
              highestConfidenceAuthorIdByPersonId[personId] = matchedItem
            }
            flatMatchesByAuthorId[currentAuthorId] = matchedItem
          }
        }
      })
    })
  }, { concurrency: 1})

  let dataRowArray
  if (getFlatMatches) {
    dataRowArray = _.values(flatMatchesByAuthorId)
  } else {
    dataRowArray =_.values(highestConfidenceAuthorIdByPersonId)
  }
  // push values to rows for output
  _.each(dataRowArray, (matched) => {
    console.log(`For '${matched['personPub']['person'].family_name}, ${matched['personPub']['person'].given_name}' Adding author: ${matched['matchedAuthor']['name']} with author id: ${matched['matchedAuthor']['authorId']} with confidence: ${matched['confidence']}`)

    matchedAuthorRows.push({
      doi: matched['personPub']['doi'],
      person_id: matched['personPub']['person_id'],
      person_family_name: matched['personPub']['person'].family_name,
      person_given_name: matched['personPub']['person'].given_name,
      confidence: matched['confidence'],
      matched_author_family_name: matched['matchedAuthor']['family'],
      matched_author_given_name: matched['matchedAuthor']['given'],
      matched_author_author_id: matched['matchedAuthor']['authorId'],
      matched_author_name: matched['matchedAuthor']['name'],
      matched_author_url: matched['matchedAuthor']['url']
    })
  })
  
  // console.log(`Matched authors for pub doi: ${personPub.doi} person id: ${personPub.person_id}, ${JSON.stringify(matchedAuthors, null, 2)}, authorList: ${JSON.stringify(authorListByDoi[personPub.doi], null, 2)}`)
  
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
