import gql from 'graphql-tag'

export default function updatePubMonth (id, month) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $month: Int!) {
        update_publications(where: {id: {_eq: $id}}, _set: {month: $month}) {
          returning {
            doi
            id
            source_name
            title
            year
            month
            day
            source_metadata
          }
        }
      }
    `,
    variables: {
      id,
      month
    }
  }
}
