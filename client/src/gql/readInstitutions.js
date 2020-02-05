import gql from 'graphql-tag'

export default function readInstitutions () {
  return {
    query: gql`
      query MyQuery {
        institutions {
          id
          name
        }
      }
    `
  }
}
