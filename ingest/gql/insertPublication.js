import gql from 'graphql-tag'

export default function insertPublication (publications) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [publications_insert_input!]!) {
        insert_publications(objects: $objects) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: publications
    }
  }
}
