import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPersons from '../client/src/gql/readPersons'
import readPublicationsAwards from './gql/readPublicationsAwards'
import insertPubAward from './gql/insertPubAward'
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

async function getAllSimplifiedPersons () {
  const queryResult = await client.query(readPersons())

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: person.family_name.toLowerCase(),
      firstInitial: person.given_name[0].toLowerCase(),
      firstName: person.given_name.toLowerCase(),
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

function getNameKey (lastName, firstName) {
  return `${_.toLower(lastName)}, ${_.toLower(firstName)}`
}

async function getPublications () {
  const queryResult = await client.query(readPublicationsAwards())
  return queryResult.data.publications
}

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

function getCrossRefAwards (publication) {
  return publication.cross_ref
}

function createNewAwardObject(publication, awardId, funderName, sourceName, sourceMetadata) {
  const newAward = {
    publication_id: publication.id,
    funder_award_identifier: awardId,
    funder_name: funderName,
    source_name: sourceName,
    source_metadata: sourceMetadata
  }
  return newAward
}

function isAwardAlreadyInDB(awardsByPubIdBySource, publication, funderName, awardId, sourceName) {
  let awardExists = false
  if (awardsByPubIdBySource[publication.id] && awardsByPubIdBySource[publication.id][sourceName]){
    const awards = awardsByPubIdBySource[publication.id][sourceName]
    const foundAwards = _.each(awards, (foundAward) => {
      // console.log(`checking award for match ${JSON.stringify(foundAward, null, 2)} for funder ${funderName} and ${awardId}`)

      if (_.toLower(foundAward['funder_name']) === _.toLower(funderName) && _.toLower(foundAward['funder_award_identifier']) === _.toLower(awardId)) {
        awardExists = true
      }
    })
  }
  return awardExists
}

async function getAwardsByPubIdBySource (publications) {
  const publicationsById = await _.mapKeys(publications, (publication) => {
    return publication.id
  })

  let awardsByPubIdBySource = {}
  _.each(_.keys(publicationsById), (id) => {
    const publication = publicationsById[id]
    if (!awardsByPubIdBySource[id]){
      awardsByPubIdBySource[id] = {}
    }
    _.each(publication.awards_aggregate.nodes, (award) => {
      if (!awardsByPubIdBySource[id][_.toLower(award.source_name)]){
        awardsByPubIdBySource[id][_.toLower(award.source_name)] = []
      }
      awardsByPubIdBySource[id][_.toLower(award.source_name)].push(award)
    })
  })
  return awardsByPubIdBySource
}

function getNewAwardsFromCrossref (awardsByPubIdBySource, publication) {
  let newAwards = []
  const crossrefFunders = publication.crossref_funders
  _.each(publication.crossref_funders, (funder) => {
    const funderName = funder['name']
    _.each (funder['award'], (awardId) => {
      if (!isAwardAlreadyInDB(awardsByPubIdBySource, publication, funderName, awardId, 'crossref')) {
        const newAward = createNewAwardObject(publication, awardId, funderName, 'crossref', funder)
        newAwards.push(newAward)
      }
    })
  })
  return newAwards
}

function getNewAwardsFromPubmed (awardsByPubIdBySource, publication) {
  let newAwards = []
  _.each(publication.pubmed_funders, (funder) => {
    const funderName = funder['funder']
    // console.log(`Funder NAME IS: ${funderName}`)
    const awardId = funder['funderIdentifier']
    // console.log(`For funder: ${funderName} Award id is: ${awardId}`)
    if (!isAwardAlreadyInDB(awardsByPubIdBySource, publication, funderName, awardId, 'pubmed')) {
      const newAward = createNewAwardObject(publication, awardId, funderName, 'pubmed', funder)
      newAwards.push(newAward)
    }
  })
  return newAwards
}

async function main (): Promise<void> {

  const publications = await getPublications()
  const awardsByPubIdBySource = await getAwardsByPubIdBySource(publications)

  // get new awards to insert later
  let newAwardsToInsert = []
  _.each(publications, (publication) => {
    // add any missing crossref awards
    newAwardsToInsert = _.concat(newAwardsToInsert, getNewAwardsFromCrossref(awardsByPubIdBySource, publication))
    newAwardsToInsert = _.concat(newAwardsToInsert, getNewAwardsFromPubmed(awardsByPubIdBySource, publication))
  })

  // console.log(`New awards to insert are: ${JSON.stringify(newAwardsToInsert, null, 2)}`)
  // now insert the awards in a batch
  const resultInsertPubAward = await client.mutate(insertPubAward(newAwardsToInsert))
  console.log(`Inserted ${resultInsertPubAward.data.insert_awards.returning.length} total awards`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
