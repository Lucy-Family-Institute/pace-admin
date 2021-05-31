import gql from 'graphql-tag'

export default function readNewPersonPublications (personId, greaterThanPersonPubId, minConfidence) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $greater_than_id: Int!, $min_confidence: float8!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id},
            id: {_gt: $greater_than_id},
            confidence: {_gte: $min_confidence}
          },
          order_by: {id: asc}
        ) {
          publication {
            id
            title
            doi
            source_name
          }
          confidence,
          id
        }
      }
    `,
    variables: {
      person_id: personId,
      greater_than_id: greaterThanPersonPubId,
      min_confidence: minConfidence
    }
  }
}
