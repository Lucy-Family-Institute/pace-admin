import gql from 'graphql-tag'

export default function readPublicationsByTitle (title) {
  return {
    query: gql`
      query MyQuery ($title: String!){
        publications (
          where: {
            title: {_ilike: $title}
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
          wos_id: source_metadata(path: "uid")
          scopus_eid: source_metadata(path: "eid")
          scopus_pii: source_metadata(path: "pii")
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
      title
    }
  }
}
