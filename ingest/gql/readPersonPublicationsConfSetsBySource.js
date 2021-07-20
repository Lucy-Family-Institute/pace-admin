import gql from 'graphql-tag'
// import _ from 'lodash'

export default function readPersonPublicationsConfSetsBySource (sourceName) {
  return {
    query: gql`
      query MyQuery ($source_name: String!) {
        confidencesets_persons_publications(
          distinct_on: persons_publications_id,
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          },
          where: {source_name: {_eq: $source_name}}
        ) {
          id
          persons_publications_id
          person_id
          person {
            id
            given_name
            family_name
            persons_namevariances {
              id
              given_name
              family_name
            }
            semantic_scholar_ids
          }
          publication {
            id
            source_metadata
          }
          publication_id
          doi
          value
          datetime
        }
      }
    `,
    variables: {
      source_name: sourceName
    }
  }
}
