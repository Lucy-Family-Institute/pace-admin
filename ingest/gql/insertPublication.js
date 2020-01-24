import gql from 'graphql-tag'

export default function insertPublication (title, doi) {
  return {
    mutation: gql`
      mutation MyMutation($title: String!, $doi: String!) {
        insert_publications(objects: {doi: $doi, title: $title}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      title,
      doi
    }
  }
}
