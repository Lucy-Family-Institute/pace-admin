import gql from 'graphql-tag'

export default function readPublicationsFromStartYear (startYear) {
  return {
    query: gql`
      query MyQuery ($startYear: Int!){
        publications (where: {year: {_gte: $startYear}}){
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
          wos_id: source_metadata(path: "uid")
          pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
          journal_title: csl(path: "container-title")
        }
      }
    `,
      variables: {
        startYear
      }
  }
}
