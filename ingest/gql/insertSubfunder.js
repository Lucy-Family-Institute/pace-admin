import gql from 'graphql-tag'

export default function insertSubfunder (subfunders) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [subfunders_insert_input!]!) {
        insert_subfunders(objects: $objects){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: subfunders
    }
  }
}