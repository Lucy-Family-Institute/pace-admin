import gql from 'graphql-tag'

export default function updateMemberDates (id, start_date, end_date) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $start_date: date!, $end_date: date!) {
        update_persons_organizations(where: {id: {_eq: $id}}, _set: {start_date: $start_date, end_date: $end_date}) {
          returning {
            id
            person_id
            person {
              id
              given_name
              family_name
            }
            start_date
            end_date
          }
        }
      }
    `,
    variables: {
      id,
      start_date,
      end_date
    }
  }
}
