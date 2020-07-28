import gql from 'graphql-tag'

export default function readSubfundersNameVariances () {
  return {
    query: gql`
      query MyQuery {
        subfunders_namevariances {
          subfunder_id
          id
          name
        }
      }
    `
  }
}
