import gql from 'graphql-tag'

export default function insertSubfunderNameVariances (nameVariances) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [subfunders_namevariances_insert_input!]!) {
        insert_subfunders_namevariances(objects: $objects){
          returning {
            id
            name
            subfunder_id
          }
        }
      }
    `,
    variables: {
      objects: nameVariances
    }
  }
}