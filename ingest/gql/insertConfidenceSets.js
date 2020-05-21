import gql from 'graphql-tag'

export default function insertConfidenceSets (confidenceSets) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [confidencesets_insert_input!]!) {
        insert_confidencesets(objects: $objects){
          returning {
            id,
            persons_publications_id,
            value,
            datetime,
            version
          }
        }
      }
    `,
    variables: {
      objects: confidenceSets
    }
  }
}