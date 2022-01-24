import gql from 'graphql-tag'
// import _ from 'lodash'

export default function readConfidenceSetByPersonPubId (personPublicationId) {
  return {
    query: gql`
      query MyQuery ($persons_publication_id: Int!) {
        confidencesets_persons_publications(
          distinct_on: persons_publications_id,
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          },
          where: {persons_publications_id: {_eq: $persons_publication_id}}
        ) {
          id
          persons_publications_id
          person_id
          publication_id
          doi
          value
          datetime
        }
      }
    `,
    variables: {
      persons_publication_id: personPublicationId
    }
  }
}
