import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import readPublicationsAwards from './gql/readPublicationsAwards'
import insertPubAward from './gql/insertPubAward'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

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

async function getPublications () {
  const queryResult = await client.query(readPublicationsAwards())
  return queryResult.data.publications
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

  // now insert the awards in a batch
  const resultInsertPubAward = await client.mutate(insertPubAward(newAwardsToInsert))
  console.log(`Inserted ${resultInsertPubAward.data.insert_awards.returning.length} total awards`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
