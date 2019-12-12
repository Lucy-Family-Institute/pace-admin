import gql from 'graphql-tag'

export default function insertSubmission (type, data) {
  return {
    mutation: gql`
      mutation MyMutation($type: String!, $data: jsonb) {
        insert_submissions(objects: {type: $type, data: $data}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      type,
      data
    }
  }
}
