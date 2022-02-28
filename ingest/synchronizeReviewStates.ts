import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'

import dotenv from 'dotenv'
import pMap from 'p-map'
import { CalculateConfidence } from './modules/calculateConfidence'
import Normalizer from './units/normalizer'
import readReviewTypes from './gql/readReviewTypes'
import insertSyncReview from './gql/insertSyncReview'
import readPersonPublicationsReviews from './gql/readPersonPublicationsReviews'
import readOrganizations from './gql/readOrganizations'
import NormedPersonPublication from './modules/normedPersonPublication'
import PublicationGraph from './modules/publicationGraph'
import PublicationSet from './modules/publicationSet'

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

async function loadReviewStates () {
  console.log('loading review states')
  const reviewStatesResult = await client.query(readReviewTypes())
  // console.log(`Review Type Results: ${JSON.stringify(reviewStatesResult.data, null, 2)}`)
  const reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
    // console.log(`Current type review is: ${JSON.stringify(typeReview, null, 2)}`)
    return typeReview.value
  })
  console.log('finished loading review states')
  return reviewStates
}

async function loadOrganizations () {
  console.log('loading review organizations')
  const reviewOrgsResult = await client.query(readOrganizations())
  console.log('finished loading review organizations')
  return reviewOrgsResult.data.review_organization
}

function getPublicationTitleKey (title: string) {
  // normalize the string and remove characters like dashes as well
  return Normalizer.normalizeString(title)
}

async function synchronizeReviewsForOrganization(persons, reviewOrgValue) {
  const reviewStates = await loadReviewStates()

  console.log(`Begin syncrhonizing all reviews for org value: ${reviewOrgValue}...`)

  let insertedReviewsCount = 0

  await pMap (persons, async (person) => {
    console.log(`Synchronizing ${reviewOrgValue} reviews for person - ID: ${person['id']}, ${person['names'][0]['lastName']}, ${person['names'][0]['firstName']}...`)
    // console.log(`Starting query publications for person id: ${person.id}...`)
    const queryResult = await client.query(readPersonPublicationsReviews(person['id'], reviewOrgValue))
    // console.log(`Finished query publications for person id: ${person.id}`)
    const publications = _.map(queryResult.data.persons_publications, (personPub) => {
      // change doi to lowercase
      _.set(personPub['publication'], 'doi', _.toLower(personPub['publication']['doi']))
      return personPub
    })

    const normedPersonPubs: NormedPersonPublication[] = _.map(publications, (personPub) => {
      let reviewTypeStatus
      let mostRecentReview
      if (personPub['reviews_aggregate'].nodes && personPub['reviews_aggregate'].nodes.length > 0) {
        reviewTypeStatus = personPub['reviews_aggregate'].nodes[0].review_type
        mostRecentReview = personPub['reviews_aggregate'].nodes[0]
      } else {
        reviewTypeStatus = 'pending'
      }
      const normedPersonPub: NormedPersonPublication = {
        id: personPub.id,
        person: personPub.person,
        publication: personPub.publication,
        reviewTypeStatus: reviewTypeStatus,
        mostRecentReview: mostRecentReview
      }
      return normedPersonPub
    })

    const pubGraph: PublicationGraph = new PublicationGraph()
    pubGraph.addToGraph(normedPersonPubs)

    const pubSets: PublicationSet[] = pubGraph.getAllPublicationSets()
    // check for any title's with reviews out of sync
    const publicationSetsOutOfSync: PublicationSet[] = []

    _.each(pubSets, (pubSet: PublicationSet) => {
      let outOfSync = false
      _.each (pubSet.personPublications, (personPub: NormedPersonPublication) => {
        if (personPub.reviewTypeStatus !== pubSet.reviewType) {
          outOfSync = true
        }
      })
      if (outOfSync) publicationSetsOutOfSync.push(pubSet)
    })

    if (publicationSetsOutOfSync.length > 0) {
      console.log(`Person id '${person['id']}' Dois found with reviews out of sync: ${JSON.stringify(publicationSetsOutOfSync, null, 2)}`)
      console.log(`Synchronizing Reviews for these personPubs out of sync for person id '${person['id']}'...`)
      await pMap(publicationSetsOutOfSync, async (pubSet: PublicationSet) => {
        // console.log(`Publication title '${title}' reviews by review type: ${JSON.stringify(publicationTitlesByReviewType[title], null, 2)}`)
        // get most recent review
        let mostRecentUpdateTime = undefined
        let newReview = {}
        let mostRecentReview = undefined
        let newReviewStatus = undefined
        let newReviewOrgValue = undefined
        _.each(pubSet.personPublications, (personPub) => {
          if (personPub.mostRecentReview) {
            // console.log(`Looking at reviews for doi: ${doi}, reviewType: ${reviewType}, nodes: ${JSON.stringify(personPub['reviews_aggregate'].nodes, null, 2)}`)
            const currentDateTime = new Date(personPub.mostRecentReview.datetime)
            if (!mostRecentUpdateTime || currentDateTime > mostRecentUpdateTime) {
              mostRecentUpdateTime = currentDateTime
              mostRecentReview = {
                reviewType: personPub.reviewTypeStatus,
                reviewOrgValue: personPub.mostRecentReview.review_organization_value,
                userId: personPub.mostRecentReview.user_id
              }
            }
          }
        })
        if (mostRecentReview) {
          await pMap (pubSet.personPublications, async (personPub) => {
            if (personPub.reviewTypeStatus !== mostRecentReview.reviewType) {
              console.log(`Inserting Review personpub: '${personPub['id']}', most recent review ${JSON.stringify(mostRecentReview, null, 2)}`)
              const mutateResult = await client.mutate(
                insertSyncReview(mostRecentReview.userId, personPub['id'], mostRecentReview.reviewType, mostRecentReview.reviewOrgValue)
              )
              insertedReviewsCount += 1
            }
          }, { concurrency: 1 })
        }
      }, { concurrency: 1 })
      console.log(`Done synchronizing Reviews for these personPubs out of sync for person id '${person['id']}'.`)
    }
  }, { concurrency: 2 })
  console.log(`Inserted ${insertedReviewsCount} reviews for org value: ${reviewOrgValue}`)
  console.log(`Done syncrhonizing all reviews for org value: ${reviewOrgValue}`)

}

//returns status map of what was done
async function main() {

  const minConfidence = Number.parseFloat(process.env.INGESTER_MIN_CONFIDENCE)
  const confidenceAlgorithmVersion = process.env.INGESTER_CONFIDENCE_ALGORITHM
  // //just get all simplified persons as will filter later
  const calculateConfidence: CalculateConfidence = new CalculateConfidence(minConfidence,confidenceAlgorithmVersion)
  console.log('Starting load person list...')
  const simplifiedPersons = await calculateConfidence.getAllSimplifiedPersons()
  console.log('Finished load person list.')

  const organizations = await loadOrganizations()

  await pMap(organizations, async (org) => {
    await synchronizeReviewsForOrganization(simplifiedPersons, org['value'])
  }, { concurrency: 1 })
}

main()
