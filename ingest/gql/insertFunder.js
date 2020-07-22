import gql from 'graphql-tag'

export default function insertFunder (funders) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [funders_insert_input!]!) {
        insert_funders(objects: $objects){
          returning {
            id
            name
            short_name
          }
        }
      }
    `,
    variables: {
      objects: funders
    }
  }
}