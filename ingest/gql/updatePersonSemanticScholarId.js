import gql from 'graphql-tag'

export default function updatePersonSemanticScholarId (id, semanticScholarId) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $semantic_scholar_id: Int!) {
        update_persons(where: {id: {_eq: $id}}, _set: {semantic_scholar_id: $semantic_scholar_id}) {
          returning {
            id
            given_name
            family_name
            start_date
            end_date,
            semantic_scholar_id
          }
        }
      }
    `,
    variables: {
      id,
      semantic_scholar_id: semanticScholarId
    }
  }
}

