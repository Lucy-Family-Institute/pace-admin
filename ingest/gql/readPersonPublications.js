import gql from 'graphql-tag'

export default function readPersonPublications (id) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id}
          },
          order_by: {confidence: asc}
        ) {
          publication {
            id
            title
            doi
            csl_string
          }
          confidence,
          id
        }
      }
    `,
    variables: {
      person_id: id
    }
  }
}
