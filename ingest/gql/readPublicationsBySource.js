import gql from 'graphql-tag'

export default function readPublicationsBySource (sourceName) {
  return {
    query: gql`
      query MyQuery ($source_name: String!){
        publications (
          where: {
            source_name: {_ilike: $source_name}
          }
        ){
          id
          title
          doi
          year
          csl
          source_name
          source_metadata
          scopus_eid: source_metadata(path: "eid")
          scopus_pii: source_metadata(path: "pii")
          wos_id: source_metadata(path: "uid")
          pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
          journal_title: csl(path: "container-title")
        }
      }
    `,
    variables: {
      source_name: sourceName
    }
  }
}
