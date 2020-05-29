import gql from 'graphql-tag'

export default function insertPubAuthor (authors) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [publications_authors_insert_input!]!) {
        insert_publications_authors(objects: $objects){
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