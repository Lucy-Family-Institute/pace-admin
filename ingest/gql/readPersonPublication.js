import gql from 'graphql-tag'

export default function readPersonPublication (id) {
  return {
    query: gql`
      query MyQuery ($id: Int!){
        persons_publications(
          where: {
            id: {_eq: $id}
          },
          order_by: {confidence: asc}
        ) {
          publication {
            id
            title
            doi
            csl_string
            source_name
            source_metadata
          }
          confidence,
          id
        }
      }
    `,
    variables: {
      id: id
    }
  }
}
