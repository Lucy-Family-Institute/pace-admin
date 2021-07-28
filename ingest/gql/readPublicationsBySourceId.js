import gql from 'graphql-tag'

export default function readPublicationsBySourceId (sourceName, sourceId) {
  return {
    query: gql`
      query MyQuery ($source_name: String!, $source_id: String!){
        publications (
          where: {
            source_name: {_eq: $source_name},
            source_id: {_eq: $source_id}
          }
        ){
          id
          title
          doi
          year
          csl_string
          csl
          source_name
          source_metadata
          source_id
          scopus_eid: source_metadata(path: "eid")
          scopus_pii: source_metadata(path: "pii")
          wos_id: source_metadata(path: "uid")
          pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
          journal_title: csl(path: "container-title")
          publications_authors {
            id
            given_name
            family_name
          }
        }
      }
    `,
    variables: {
      source_name: sourceName,
      source_id: sourceId
    }
  }
}
