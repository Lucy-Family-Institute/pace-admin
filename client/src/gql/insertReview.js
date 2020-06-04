import gql from 'graphql-tag'

export default function insertReview (userId, personPublicationId, reviewType, reviewOrganization) {
  return {
    mutation: gql`
      mutation MyMutation($user_id: Int!, $persons_publications_id: Int!, $reviewType: type_review_enum!, $review_organization_value: review_organization_enum!) {
        insert_reviews(objects: {
          reviewType: $reviewType,
          user_id: $user_id, 
          persons_publications_id: $persons_publications_id,
          review_organization_value: $review_organization_value}) {
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
      reviewType,
      review_organization_value: reviewOrganization
    }
  }
}
