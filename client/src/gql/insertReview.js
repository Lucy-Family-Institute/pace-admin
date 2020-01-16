import gql from 'graphql-tag'

export default function insertReview (username, personId, publicationId, reviewStateAbbrev) {
  return {
    mutation: gql`
      mutation MyMutation($username: String!, $person_id: Int!, $publication_id: Int!, $reviewstate_abbrev: String!) {
        insert_reviews(objects: {
          persons_publication: {
            data: {
              person_id: $person_id, 
              publication_id: $publication_id
          }}, 
          reviewstate: {
            data: {
              abbrev: "ACC"}},
              user: {
                data: {
                  username: "reviewer1"
        }}}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      username: username,
      person_id: personId,
      publication_id: publicationId,
      reviewstate_abbrev: reviewStateAbbrev
    }
  }
}
