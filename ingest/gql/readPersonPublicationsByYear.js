import gql from 'graphql-tag'

export default function readPersonPublicationsByYear (id, year) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $year: Int!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id},
            publication: {year: {_eq: $year}}
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
      person_id: id,
      year: year
    }
  }
}
