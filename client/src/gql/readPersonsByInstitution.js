import gql from 'graphql-tag'

export default function readPersonsByInstitution (institutionId) {
  return {
    query: gql`
      query MyQuery ($institution_id: Int!){
        persons (
          where: {
            institution: {
              id: { _eq: $institution_id}
            }
          }
          order_by: {
            persons_publications_aggregate: {count: desc}
          }
        )
        {
          id
          given_name
          family_name
          institution {
            name
          }
          persons_publications_aggregate {
            aggregate {
              count
            }
          }
        }
      }
    `,
    variables: {
      institution_id: institutionId
    }
  }
}
