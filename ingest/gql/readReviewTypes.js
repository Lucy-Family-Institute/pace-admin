import gql from 'graphql-tag'

export default function readReviewTypes () {
  return {
    query: gql`
      query MyQuery {
        type_review {
          value
          comment
        }
      }
    `
  }
}