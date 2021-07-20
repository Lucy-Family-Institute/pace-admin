import gql from 'graphql-tag'

export default function readPublicationsCSL () {
  return {
    query: gql`
      query MyQuery {
        publications{
          id
          csl
          doi
        }
      }
    `
  }
}
