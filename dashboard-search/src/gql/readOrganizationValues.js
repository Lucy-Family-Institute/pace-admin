import gql from 'graphql-tag'

export default function readOrganizationValues () {
  return gql
  `query MyQuery {
      review_organization (
        where: {
          review_organization_levels: {
            level: {_gt: 1}
        }
      },
      order_by: {comment: asc}
    ){
      value
      comment
    }
  }`
}
