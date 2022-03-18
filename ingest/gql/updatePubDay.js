import gql from 'graphql-tag'

export default function updatePubDay (id, day) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $day: Int!) {
        update_publications(where: {id: {_eq: $id}}, _set: {day: $day}) {
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
      day
    }
  }
}
