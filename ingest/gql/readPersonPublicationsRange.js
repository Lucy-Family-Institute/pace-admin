import gql from 'graphql-tag'

export default function readPersonPublicationsRange (personId, greaterThanPersonPubId, resultLimit) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $greater_than_id: Int!, $result_limit: Int!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id},
            id: {_gt: $greater_than_id}
          },
          order_by: {id: asc},
          limit: $result_limit
        ) {
          publication {
            id
            title
            doi
            csl_string
            source_name
            source_metadata
          }
          confidence,
          id
        }
      }
    `,
    variables: {
      person_id: personId,
      greater_than_id: greaterThanPersonPubId,
      result_limit: resultLimit
    }
  }
}
