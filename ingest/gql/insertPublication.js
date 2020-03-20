import gql from 'graphql-tag'

export default function insertPublication (title, doi, csl, sourceName, sourceMetadata) {
  return {
    mutation: gql`
      mutation MyMutation($title: String!, $doi: String!, $csl: String!, $source_name: String!, $source_metadata: String!) {
        insert_publications(objects: {doi: $doi, title: $title, csl: $csl, source_name: $source_name, source_metadata: $source_metadata}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      title,
      doi,
      csl,
      source_name: sourceName,
      source_metadata: sourceMetadata
    }
  }
}
