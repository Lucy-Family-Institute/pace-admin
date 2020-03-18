import gql from 'graphql-tag'

export default function insertPubAuthor (authors) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [authors_publications_insert_input!]!) {
        insert_authors_publications(objects: $objects){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      objects: authors
    }
  }
}