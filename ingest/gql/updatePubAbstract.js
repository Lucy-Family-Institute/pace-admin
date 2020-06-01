import gql from 'graphql-tag'

export default function updatePubAbstract (doi, abstract) {
  return {
    mutation: gql`
      mutation MyMutation($doi: String!, $abstract: String!) {
        update_publications(where: {doi: {_eq: $doi}}, _set: {abstract: $abstract}) {
          returning {
            abstract
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
      doi,
      abstract
    }
  }
}
