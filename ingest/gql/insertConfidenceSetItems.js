import gql from 'graphql-tag'

export default function insertConfidenceSetItems (confidenceSetItems) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [confidencesets_items_insert_input!]!) {
        insert_confidencesets_items(objects: $objects){
          returning {
            id
            confidenceset_id
            confidence_type_id
            value
            comment
          }
        }
      }
    `,
    variables: {
      objects: confidenceSetItems
    }
  }
}