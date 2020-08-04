import gql from 'graphql-tag'
// import _ from 'lodash'

export default function readPersonPublicationsReviewsConfSets (personPubIds) {
  const idsString = JSON.stringify(personPubIds)
  // let idsString = ''
  // for now manually construct the string for names in the array
  // _.forEach(personPubIds, (value, index) => {
  //   if (index > 0) {
  //     idsString = `${idsString},`
  //   }
  //   idsString = `${idsString}"${value}"`
  // })

  return gql`
      query MyQuery {
        persons_publications(
          where: {id: {_in: ${idsString}}}
          order_by: {confidence: desc, publication: {title: asc}}
        ) {
          id
          person_id
          publication_id
          publication {
            id
            doi
          }
          confidencesets_aggregate(limit: 1, order_by: {datetime: desc}) {
            nodes {
              id
              value
              datetime
            }
          }
          reviews_aggregate(where: {review_organization_value: {_eq: ND}}, limit: 1, order_by: {datetime: desc}) {
            nodes {
              review_type
              id
              datetime
            }
          }
          org_reviews_aggregate: reviews_aggregate(where: {review_organization_value: {_eq: HCRI}}, limit: 1, order_by: {datetime: desc}) {
            nodes {
              review_type
              id
              datetime
            }
          }
        }
      }
    `
// reviews_aggregate(where: {review_organization_value: {_eq: ND}}, limit: 1, order_by: {datetime: desc}) {
//   nodes {
//     review_type
//     id
//     datetime
//   }
// }
//       org_reviews_aggregate: reviews_aggregate(where: {review_organization_value: {_eq: HCRI}}, limit: 1, order_by: {datetime: desc}) {
//         nodes {
//           review_type
//           id
//           datetime
//         }
//       }
//       confidencesets_aggregate(limit: 1, order_by: {datetime: desc}) {
//         nodes {
//           id
//           value
//           datetime
//         }
//       }
//     }
//   }
// `
}
