import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import MeiliSearch from 'meilisearch'
import util from 'util'

const sleep = util.promisify(setTimeout)

const searchClient = new MeiliSearch({
  host: 'http://127.0.0.1:7700'
})

const gqlClient = new ApolloClient({
  link: createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    headers: {
      'x-hasura-admin-secret': 'mysecret'
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main() {
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
        persons_publications(where: {reviews: {reviewType: {_eq: accepted}, review_organization_value: {_eq: ND}}}) {
          id
          reviews(order_by: {datetime: desc}, limit: 1) {
            reviewType
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

  const documents = _.chain(results.data.persons_publications)
    .map((doc) => {
      if (doc.reviews[0].reviewType !== 'accepted')
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
    'year', 'type', 'journal', 'classifications', 'authors', 'journal_type', 'publisher'
  ])
  do {
    await sleep(10)
    status = await index.getUpdateStatus(updateId)
  } while (status.status !== 'processed')
}

main()