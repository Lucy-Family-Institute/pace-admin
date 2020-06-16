import gql from 'graphql-tag'

export default function readClassifications () {
  return {
    query: gql`
      query MyQuery {
        classifications {
          id
          name
          identifier
          scheme
        }
      }
    `
  }
}
