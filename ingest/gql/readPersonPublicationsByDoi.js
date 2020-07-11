import gql from 'graphql-tag'

export default function readPersonPublicationsByDoi (doi, person_id) {
  return {
    query: gql`
      query MyQuery ($doi: String!, $person_id: Int!){
        persons_publications_metadata (
          where: {
            doi: {_eq: $doi},
            person_id: {_eq: $person_id}
          }
        ){
          id
          title
          doi
          year
          source_name
          reviews_aggregate (order_by: {datetime: desc}) {
            nodes {
              datetime
              id
              persons_publications_id
              review_organization_value
              review_type
              user_id
            }
          }
        }
      }
    `,
    variables: {
      doi,
      person_id
    }
  }
}
