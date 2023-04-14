import gql from 'graphql-tag'

export default function updatePersonGoogleScholarId (id, googleScholarId) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $google_scholar_id: String!) {
        update_persons(where: {id: {_eq: $id}}, _set: {google_scholar_id: $google_scholar_id}) {
          returning {
            id
            given_name
            family_name
            start_date
            end_date,
            google_scholar_id
          }
        }
      }
    `,
    variables: {
      id,
      google_scholar_id: JSON.stringify(googleScholarId)
    }
  }
}
