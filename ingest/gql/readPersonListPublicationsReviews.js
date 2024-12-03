import gql from 'graphql-tag'

export default function readPersonListPublicationsReviews (personIds, reviewOrgValue) {
    const idsString = JSON.stringify(personIds)
    return {
        query: gql`
        query MyQuery {
          reviews_persons_publications(
            distinct_on: persons_publications_id,
            order_by: {
              persons_publications_id: asc, 
              datetime: desc
            },
            where: {person_id: {_in: ${idsString}},
                    review_organization_value: {_eq: "${reviewOrgValue}"},
                    review_type: {_eq: "accepted"}}
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
  }
