import gql from 'graphql-tag'

export default function readConfidenceSetItems (confidenceSetId) {
  return {
    query: gql`
      query MyQuery ($confidenceset_id: Int!){
        confidencesets_items (
          order_by: {
            confidence_type: {
              rank: asc, 
              id: asc
            }
          }
          where: {
            confidenceset_id: {_eq: $confidenceset_id}
          }
        ){
          confidenceset_id
          id
          value
          comment
          confidence_type {
            id
            name
            rank
            description
          }
        }
      }
    `,
    variables: {
      confidenceset_id: confidenceSetId
    }
  }
}
