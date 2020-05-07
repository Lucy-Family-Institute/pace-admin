import gql from 'graphql-tag'

export default function readConfidenceTypes () {
  return {
    query: gql`
      query MyQuery {
        confidence_type {
          description
          id
          name
          rank
        }
      }
    `
  }
}