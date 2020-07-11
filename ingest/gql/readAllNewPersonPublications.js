import gql from 'graphql-tag'

export default function readAllNewPersonPublications (greaterThanPersonPubId) {
  return {
    query: gql`
      query MyQuery ($greater_than_id: Int!){
        persons_publications(
          where: {
            id: {_gt: $greater_than_id}
          },
          order_by: {confidence: asc}
        ) {
          publication {
            id
            title
            doi
            csl_string
          }
          confidence,
          id,
          person_id
        }
      }
    `,
    variables: {
      greater_than_id: greaterThanPersonPubId
    }
  }
}
