import gql from 'graphql-tag'

export default function updatePersonGoogleScholarIds (id, googleScholarIds) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $google_scholar_ids: String!) {
        update_persons(where: {id: {_eq: $id}}, _set: {google_scholar_ids: $google_scholar_ids}) {
          returning {
            id
            given_name
            family_name
            start_date
            end_date,
            google_scholar_ids
          }
        }
      }
    `,
    variables: {
      id,
      google_scholar_ids: JSON.stringify(googleScholarIds)
    }
  }
}
