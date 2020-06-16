import gql from 'graphql-tag'

export default function insertJournal (journals) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [journals_insert_input!]!) {
        insert_journals(objects: $objects) {
          returning {
            id
            title
          }
        }
      }
    `,
    variables: {
      objects: journals
    }
  }
}
