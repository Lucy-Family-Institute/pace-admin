import gql from 'graphql-tag'

export default function insertReview (userId, personPublicationId, reviewStateAbbrev) {
  return {
    mutation: gql`
      mutation MyMutation($user_id: Int!, $persons_publication_id: Int!, $reviewstate_abbrev: String!) {
        insert_reviews(objects: {
          reviewstate_abbrev: $reviewstate_abbrev, 
          user_id: $user_id, 
          persons_publications_id: $persons_publication_id}) {
          returning {
            id,
            person_publications_id
          }
        }
      }
    `,
    variables: {
      user_id: userId,
      persons_publication_id: personPublicationId,
      reviewstate_abbrev: reviewStateAbbrev
    }
  }
}
