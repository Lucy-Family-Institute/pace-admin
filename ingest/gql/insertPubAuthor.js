import gql from 'graphql-tag'

export default function insertPubAuthor (publicationId, givenName, familyName, authorPosition) {
  return {
    mutation: gql`
      mutation MyMutation($publication_id: Int!, $given_name: String!, $family_name: String!, $position: Int!) {
        insert_authors_publications(objects: {
          publication_id: $publication_id, 
          given_name: $given_name,
          family_name: $family_name,
          position: $position 
        }){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      publication_id: publicationId,
      given_name: givenName,
      family_name: familyName,
      position: authorPosition
    }
  }
}