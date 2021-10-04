import gql from 'graphql-tag'

export default function updatePubYear (id, year) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $year: Int!) {
        update_publications(where: {id: {_eq: $id}}, _set: {year: $year}) {
          returning {
            doi
            id
            source_name
            title
            year
            source_metadata
          }
        }
      }
    `,
    variables: {
      id,
      year
    }
  }
}
