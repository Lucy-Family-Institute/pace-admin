import gql from 'graphql-tag'

export default function readFunders () {
  return {
    query: gql`
      query MyQuery {
        funders {
          id
          name
          short_name
          uri
          subfunders {
            funder_id
            id
            name
            short_name
            subfunders_namevariances {
              id
              name
              subfunder_id
            }
          }
          funders_namevariances {
            funder_id
            id
            name
          }
        }
      }
    `
  }
}
