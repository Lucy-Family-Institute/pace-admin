import gql from 'graphql-tag'

export default function insertFunderNameVariances (nameVariances) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [funders_namevariances_insert_input!]!) {
        insert_funders_namevariances(objects: $objects){
          returning {
            id
            name
            funder_id
          }
        }
      }
    `,
    variables: {
      objects: nameVariances
    }
  }
}