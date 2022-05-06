import gql from 'graphql-tag'
// import _ from 'lodash'

export default function readPersonPublicationsReviews (personPubIds, reviewOrgValue) {
  const idsString = JSON.stringify(personPubIds)
  return gql`
      query MyQuery {
        reviews_persons_publications(
          distinct_on: persons_publications_id,
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          },
          where: {persons_publications_id: {_in: ${idsString}},
                  review_organization_value: {_eq: "${reviewOrgValue}"}}
        ) {
          id
          persons_publications_id
          person_id
          publication_id
          doi
          title
          year
          review_type
          datetime
        }
      }
    `
}
