import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import MeiliSearch from 'meilisearch'
import util from 'util'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT
const meiliKey = process.env.MEILI_KEY
const meiliUrl = process.env.MEILI_PRIVATE_URL
const meiliCenterSearch = process.env.MEILI_CENTER_SEARCH

const sleep = util.promisify(setTimeout)

const searchClient = new MeiliSearch({
  host: meiliUrl,
  apiKey: meiliKey
})

const gqlClient = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main() {
  console.log(await searchClient.getKeys())
  try {
    await searchClient.getIndex('publications').deleteIndex()
  } catch ( err ) {
    
  }

  let index
  try {
    index = await searchClient.createIndex('publications')
  } catch ( err ) {
    index = await searchClient.getIndex('publications')
  }

  const results = await gqlClient.query({
    query: gql`
      query MyQuery {
        persons_publications(where: {reviews: {review_type: {_eq: accepted}, review_organization_value: {_eq: ${meiliCenterSearch}}},
          org_reviews: {review_type: {_eq: "accepted"}, review_organization_value: {_eq: "ND"}}}) {
          id
          org_reviews(order_by: {datetime: desc}, limit: 1) {
            review_type
          }
          reviews(order_by: {datetime: desc}, limit: 1) {
            review_type
          }
          publication {
            id
            abstract
            doi
            title
            year
            journal {
              title
              journal_type
              journals_classifications {
                classification {
                  identifier
                  name
                }
              }
              publisher
            }
          }
          person {
            family_name
            given_name
            id
          }
        }
      }    
    `
  })

  const topLevelClassifications = {
    '10': 'Multidisciplinary',
    '11':  'Agricultural and Biological Sciences',
    '12' : 'Arts and Humanities',
    '13' : 'Biochemistry, Genetics and Molecular Biology',
    '14' : 'Business, Management and Accounting',
    '15' : 'Chemical Engineering',
    '16' : 'Chemistry',
    '17' : 'Computer Science',
    '18' : 'Decision Sciences',
    '19' : 'Earth and Planetary Sciences',
    '20' : 'Economics, Econometrics and Finance',
    '21' : 'Energy',
    '22' : 'Engineering',
    '23' : 'Environmental Science',
    '24' : 'Immunology and Microbiology',
    '25' : 'Materials Science',
    '26' : 'Mathematics',
    '27' : 'Medicine',
    '28' : 'Neuroscience',
    '29' : 'Nursing',
    '30' : 'Pharmacology, Toxicology and Pharmaceutics',
    '31' : 'Physics and Astronomy',
    '32' : 'Psychology',
    '33' : 'Social Sciences',
    '34' : 'Veterinary',
    '35' : 'Dentistry',
    '36' : 'Health Professions'
  }

  const documents = _.chain(results.data.persons_publications)
    .map((doc) => {
      if (doc.reviews[0].review_type !== 'accepted')
        return null
      return {
        id: `p${doc.publication.id}`,
        type: 'publication',
        doi: _.get(doc.publication, 'doi'),
        title: _.get(doc.publication, 'title'),
        year: _(_.get(doc.publication, 'year')).toString(),
        abstract: _.get(doc.publication, 'abstract', null),
        journal: _.get(doc.publication, 'journal.title', null),
        journal_type: _.get(doc.publication, 'journal.journal_type', null),
        classificationsTopLevel: _.uniq(_.map(
          _.get(doc.publication, 'journal.journals_classifications', []),
          function ( obj ) {
            const sliced = _.chain(obj.classification.identifier).slice(0, 2).join('').value()
            return topLevelClassifications[sliced]
          }
        )),
        classifications: _.map(_.get(doc.publication, 'journal.journals_classifications', []), c => c.classification.name),
        authors: `${_.get(doc.person, 'family_name')}, ${_.get(doc.person, 'given_name')}`,
        publisher: _.get(doc.publication, 'journal.publisher', null),
        wildcard: "*" // required for empty search (i.e., return all)
      }
    })
    .compact()
    .groupBy('id')
    .map(doc => _.mergeWith(
      {authors: []}, ...doc, (o, v, k) =>  k === 'authors' ? o.concat(v) : v)
    )
    .uniqBy('doi')
    .value()

  console.log(`Mapped #: ${documents.length}`)

  await index.addDocuments(documents)

  console.log(`Documents added`)

  let status
  const { updateId } = await index.updateAttributesForFaceting([
    'year', 'type', 'journal', 'classifications', 'authors', 'journal_type', 'publisher', 'classificationsTopLevel'
  ])
  do {
    await sleep(10)
    status = await index.getUpdateStatus(updateId)
  } while (status.status !== 'processed')
}

main()