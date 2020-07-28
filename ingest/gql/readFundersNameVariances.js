import gql from 'graphql-tag'

export default function readFundersNameVariances () {
  return {
    query: gql`
      query MyQuery {
        funders_namevariances {
          funder_id
          id
          name
        }
      }
    `
  }
}
