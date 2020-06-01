import gql from 'graphql-tag'

export default function readPublications () {
  return {
    query: gql`
      query MyQuery {
        publications {
          id
          title
          doi
          year
          csl_string
          csl
          source_name
          source_metadata
          scopus_eid: source_metadata(path: "eid")
          scopus_pii: source_metadata(path: "pii")
          pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
        }
      }
    `
  }
}
