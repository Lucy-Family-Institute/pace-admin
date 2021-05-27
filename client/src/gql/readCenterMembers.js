import gql from 'graphql-tag'

export default function readCenterMembers () {
  return {
    query: gql`
      query MyQuery {
        persons_organizations {
          id
          person_id
          organization_value
          start_date
          end_date
          person {
            id
            given_name
            family_name
            start_date
            end_date
            semantic_scholar_id
            institution {
              name
            }
            persons_namevariances {
              id
              given_name
              family_name
            }
          }
        }
      }
    `
  }
}
