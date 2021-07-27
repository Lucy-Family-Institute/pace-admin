import gql from 'graphql-tag'

export default function readPublications () {
  return {
    query: gql`
      query MyQuery {
        publications {
          id
          title
          doi
          source_name
          source_id
        }
      }
    `
  }
}
