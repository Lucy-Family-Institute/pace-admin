import gql from 'graphql-tag'

export default function readPublicationsAwards () {
  return {
    query: gql`
      query MyQuery {
        publications {
          id
          title
          doi
          source_name
          pubmed_funders: source_metadata(path: "funderIdentifiers")
          crossref_funders: csl(path:"funder")
          scopus_eid: source_metadata(path: "eid")
          pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
          abstract
          year
          awards_aggregate {
            nodes {
              funder_award_identifier
              funder_name
              id
              publication_id
              source_name
            }
          }
        }
      }
    `
  }
}
