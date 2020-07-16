import gql from 'graphql-tag'

export default function insertPubAward (awards) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [awards_insert_input!]!) {
        insert_awards(objects: $objects){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: awards
    }
  }
}