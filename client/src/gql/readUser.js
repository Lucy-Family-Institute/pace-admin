import gql from 'graphql-tag'

export default function readUser (username) {
  return {
    query: gql`
      query MyQuery ($username: String!){
        users(where: {username: {_eq: $username}}) {
          email
          id
          username
        }
      }
    `,
    variables: {
      username: username
    }
  }
}
