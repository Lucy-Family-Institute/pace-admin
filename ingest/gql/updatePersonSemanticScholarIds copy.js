import gql from 'graphql-tag'

export default function updatePersonSemanticScholarIds (id, semanticScholarIds) {
  return {
    mutation: gql`
      mutation MyMutation($id: Int!, $semantic_scholar_ids: String!) {
        update_persons(where: {id: {_eq: $id}}, _set: {semantic_scholar_ids: $semantic_scholar_ids}) {
          returning {
            id
            given_name
            family_name
            start_date
            end_date,
            semantic_scholar_ids
          }
        }
      }
    `,
    variables: {
      id,
      semantic_scholar_ids: JSON.stringify(semanticScholarIds)
    }
  }
}
