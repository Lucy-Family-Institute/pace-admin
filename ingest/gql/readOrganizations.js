import gql from 'graphql-tag'

export default function readOrganizations () {
  return {
    query: gql`
      query MyQuery {
        review_organization {
          value
          comment
        }
      }
    `
  }
}