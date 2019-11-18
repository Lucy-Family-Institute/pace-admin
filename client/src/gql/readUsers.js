import gql from 'graphql-tag'

export default function readUsers () {
  return {
    query: gql`
      query MyQuery {
        persons {
          id
          first_name
          last_name
        }
      }
    `
}
