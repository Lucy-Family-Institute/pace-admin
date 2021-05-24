import gql from 'graphql-tag'

export default function insertPersonPublication (personPublications) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [persons_publications_insert_input!]!) {
        insert_persons_publications(objects: $objects){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: personPublications
    }
  }
}
