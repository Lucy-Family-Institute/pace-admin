import gql from 'graphql-tag'

export default function insertReview (userId, personPublicationId, reviewType, reviewOrganization) {
  return {
    mutation: gql`
      mutation MyMutation($user_id: Int!, $persons_publications_id: Int!, $review_type: type_review_enum!, $review_organization_value: review_organization_enum!) {
        insert_reviews(objects: {
          review_type: $review_type,
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
      review_type: reviewType,
      review_organization_value: reviewOrganization
    }
  }
}
