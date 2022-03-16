import gql from 'graphql-tag'

export default function updatePersonStartDateEndDateIsNull (id, start_date) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $start_date: date!) {
        update_persons(where: {id: {_eq: $id}}, _set: {start_date: $start_date, end_date: null}) {
          returning {
            id
            given_name
            family_name
            start_date
            end_date
          }
        }
      }
    `,
    variables: {
      id,
      start_date
    }
  }
}
