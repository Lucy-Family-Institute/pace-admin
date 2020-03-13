import gql from 'graphql-tag'

export default function insertPublication (title, doi, csl) {
  return {
    mutation: gql`
      mutation MyMutation($title: String!, $doi: String!, $csl: String!) {
        insert_publications(objects: {doi: $doi, title: $title, csl: $csl}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      title,
      doi,
      csl
    }
  }
}
