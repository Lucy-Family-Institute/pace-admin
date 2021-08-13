import gql from 'graphql-tag'

export default function readPersonPublicationsReviews (id, orgValue) {
  return {
    query: gql`
    query MyQuery ($person_id: Int!, $review_organization_value: review_organization_enum!){
      persons_publications(
        where: {
          person_id: {_eq: $person_id}
        },
        order_by: {confidence: asc}
      ) {
        publication {
          id
          title
          doi
          source_name
          source_id
        }
        reviews_aggregate(where: {review_organization_value: {_eq: $review_organization_value}}, limit: 1, order_by: {datetime: desc}) {
          nodes {
            datetime
            id
            persons_publications_id
            review_organization_value
            review_type
            user_id
          }
        }
        confidence,
        id
      }
    }
    `,
    variables: {
      person_id: id,
      review_organization_value: orgValue
    }
  }
}
