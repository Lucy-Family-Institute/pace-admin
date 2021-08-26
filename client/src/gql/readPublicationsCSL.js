import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPublicationsCSL (publicationIds) {
  let pubIdString = ''
  // for now manually construct the string for ids in the array
  _.forEach(publicationIds, (value, index) => {
    if (index > 0) {
      pubIdString = `${pubIdString},`
    }
    pubIdString = `${pubIdString}"${value}"`
  })

  return gql`
    query MyQuery {
    publications(
      where: {
        id: {_in: [${pubIdString}]}
      }
    ){
      id
      doi
      title
      source_name
      scopus_eid: source_metadata(path: "eid")
      pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
      semantic_scholar_id: source_metadata(path: "paperId")
      wos_id: source_metadata(path: "uid")
      csl_string
    }
  }
  `
}
