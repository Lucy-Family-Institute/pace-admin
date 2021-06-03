import gql from 'graphql-tag'

export default function readNewPersonPublicationsCountByYear (id, year) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $year: Int!){
        persons_publications_aggregate(
          where: {
            person_id: {_eq: $person_id},
            publication: {year: {_eq: $year}}
          },
          order_by: {id: asc}
        ) {
          aggregate {
            count(columns: id)
          }
        }
      }
    `,
    variables: {
      person_id: id,
      year: year
    }
  }
}
