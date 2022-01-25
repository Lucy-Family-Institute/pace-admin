// use this insert when replicating a review across all sources for a publication
// this is needed as the user id also needs to be synchronized with the past reviewer user id
import gql from 'graphql-tag'

export default function insertSyncReview (userId, personPublicationId, reviewType, reviewOrganization) {
  return {
    mutation: gql`
      mutation MyMutation($user_id: Int!, $persons_publications_id: Int!, $review_type: type_review_enum!, $review_organization_value: review_organization_enum!) {
        insert_reviews(objects: {
          user_id: $user_id,
          review_type: $review_type,
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
