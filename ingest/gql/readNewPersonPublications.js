import gql from 'graphql-tag'

export default function readNewPersonPublications (id, greaterThanPersonPubId) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $greater_than_id: Int!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id},
            id: {_gt: $greater_than_id}
          },
          order_by: {confidence: asc}
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
      person_id: id,
      greater_than_id: greaterThanPersonPubId
    }
  }
}
