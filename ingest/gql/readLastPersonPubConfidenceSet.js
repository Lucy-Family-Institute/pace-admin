import gql from 'graphql-tag'

export default function readLastPersonPubConfidenceSet () {
  return {
    query: gql`
      query MyQuery {
        confidencesets(order_by: {persons_publications_id: desc}, limit: 1) {
          datetime
          id
          persons_publication {
            confidence
            data_id
            id
            person_id
            provenance_id
            publication_id
          }
          persons_publications_id
          value
          version
        }
      }
    `
  }
}
