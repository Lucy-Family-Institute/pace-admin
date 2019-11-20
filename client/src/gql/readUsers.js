import gql from 'graphql-tag'

export default function readUsers () {
  return {
    query: gql`
      query MyQuery {
        persons {
          id
          given_name
          family_name
        }
      }
    `
  }
}
