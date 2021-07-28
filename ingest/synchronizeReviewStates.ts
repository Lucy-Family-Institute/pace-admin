import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'

import dotenv from 'dotenv'
import pMap from 'p-map'
import { CalculateConfidence } from './modules/calculateConfidence'

import readReviewTypes from './gql/readReviewTypes'
import insertReview from '../client/src/gql/insertReview'
import readPersonPublicationsReviews from './gql/readPersonPublicationsReviews'
import readOrganizations from './gql/readOrganizations'

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

    // console.log(`Start group by publications for person id: ${person.id}...`)
    const publicationsGroupedByReview = _.groupBy(publications, function (pub) {
      if (pub['reviews_aggregate'].nodes && pub['reviews_aggregate'].nodes.length > 0) {
        return pub['reviews_aggregate'].nodes[0].review_type
      } else {
        return 'pending'
      }
    })
    // console.log(`Finish group by publications for person id: ${person.id}.`)

    // check for any title's with reviews out of sync,
    // if more than one review type found add title mapped to array of reviewtype to array pub list
    let publicationTitlesByReviewType = {}
    
    // put in pubs grouped by doi for each review status
    _.each(reviewStates, (reviewType) => {
      const publications = publicationsGroupedByReview[reviewType]
      _.each(publications, (personPub) => {
        if (personPub.doi !== null){
          if (!publicationTitlesByReviewType[personPub['publication'].title]) {
            publicationTitlesByReviewType[personPub['publication'].title] = {}
          }
          if (!publicationTitlesByReviewType[personPub['publication'].title][reviewType]) {
            publicationTitlesByReviewType[personPub['publication'].title][reviewType] = []
          }
          publicationTitlesByReviewType[personPub['publication'].title][reviewType].push(personPub)
        }
      })
    })

    // check for any title's with reviews out of sync
    const publicationTitlesOutOfSync = []

    _.each(_.keys(publicationTitlesByReviewType), (title) => {
      if (_.keys(publicationTitlesByReviewType[title]).length > 1) {
        // console.log(`Warning: Doi out of sync found: ${doi} for person id: ${this.person.id} doi record: ${JSON.stringify(publicationDoisByReviewType[doi], null, 2)}`)
        publicationTitlesOutOfSync.push(title)
      }
    })

    if (publicationTitlesOutOfSync.length > 0) {
      console.log(`Person id '${person['id']}' Dois found with reviews out of sync: ${JSON.stringify(publicationTitlesOutOfSync, null, 2)}`)
      console.log(`Synchronizing Reviews for these personPubs out of sync for person id '${person['id']}'...`)
      await pMap(publicationTitlesOutOfSync, async (title) => {
        // console.log(`Publication title '${title}' reviews by review type: ${JSON.stringify(publicationTitlesByReviewType[title], null, 2)}`)
        // get most recent review
        let mostRecentUpdateTime = undefined
        let newReview = {}
        let mostRecentReview = undefined
        let newReviewStatus = undefined
        let newReviewOrgValue = undefined
        _.each(_.keys(publicationTitlesByReviewType[title]), (reviewType) => {
          // just get first one
          const personPub = publicationTitlesByReviewType[title][reviewType][0]
          if (personPub['reviews_aggregate'].nodes.length > 0) {
            // console.log(`Looking at reviews for doi: ${doi}, reviewType: ${reviewType}, nodes: ${JSON.stringify(personPub['reviews_aggregate'].nodes, null, 2)}`)
            const currentDateTime = new Date(personPub['reviews_aggregate'].nodes[0].datetime)
            if (!mostRecentUpdateTime || currentDateTime > mostRecentUpdateTime) {
              mostRecentUpdateTime = currentDateTime
              mostRecentReview = {
                reviewType: reviewType,
                reviewOrgValue: personPub['reviews_aggregate'].nodes[0].review_organization_value,
                userId: personPub['reviews_aggregate'].nodes[0].user_id
              }
            }
          }
        })
        if (mostRecentReview) {
          await pMap (reviewStates, async (reviewType) => {
            if (reviewType !== mostRecentReview.reviewType && publicationTitlesByReviewType[title][reviewType]) {
              await pMap (publicationTitlesByReviewType[title][reviewType], async (personPub) => {
                console.log(`Inserting Review for title: ${title}, personpub: '${personPub['id']}', most recent review ${JSON.stringify(mostRecentReview, null, 2)}`)
                const mutateResult = await client.mutate(
                  insertReview(mostRecentReview.userId, personPub['id'], mostRecentReview.reviewType, mostRecentReview.reviewOrgValue)
                )
                insertedReviewsCount += 1
              }, { concurrency: 1 })
            }
          }, { concurrency: 1 })
        }
      }, { concurrency: 1 })
      console.log(`Done synchronizing Reviews for these personPubs out of sync for person id '${person['id']}'.`)
    }
  }, { concurrency: 1 })
  console.log(`Inserted ${insertedReviewsCount} reviews for org value: ${reviewOrgValue}`)
  console.log(`Done syncrhonizing all reviews for org value: ${reviewOrgValue}`)

}

//returns status map of what was done
async function main() {

  // //just get all simplified persons as will filter later
  const calculateConfidence: CalculateConfidence = new CalculateConfidence()
  console.log('Starting load person list...')
  const simplifiedPersons = await calculateConfidence.getAllSimplifiedPersons()
  console.log('Finished load person list.')

  const organizations = await loadOrganizations()

  await pMap(organizations, async (org) => {
    await synchronizeReviewsForOrganization(simplifiedPersons, org['value'])
  }, { concurrency: 1 })
}

main()
