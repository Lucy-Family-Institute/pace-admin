import gql from 'graphql-tag'

export default function insertReview (userId, personPublicationId, reviewType) {
  return {
    mutation: gql`
      mutation MyMutation($user_id: Int!, $persons_publications_id: Int!, $reviewType: type_review_enum!) {
        insert_reviews(objects: {
          reviewType: $reviewType,
          user_id: $user_id, 
          persons_publications_id: $persons_publications_id}) {
          returning {
            id,
            persons_publications_id
          }
        }
      }
    `,
    variables: {
      user_id: userId,
      persons_publications_id: personPublicationId,
      reviewType
    }
  }
}
