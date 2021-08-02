import gql from 'graphql-tag'

export default function readPersonPublicationsConfSetsCount (id, minConfidence) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $min_confidence: float8!){
        persons_publications (
          where: {
            person_id: {_eq: $person_id},
            confidence: {_gte: $min_confidence}
          },
          order_by: {confidencesets_aggregate: {count: asc}, id: asc}
        ) {
          id
          person_id
          confidence
          publication {
            id
            doi
            title
            year
          }
          confidencesets_aggregate {
            aggregate {
              count(columns: persons_publications_id)
            }
          }
        }
      }
    `,
    variables: {
      person_id: id,
      min_confidence: minConfidence
    }
  }
}
