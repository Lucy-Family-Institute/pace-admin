import gql from 'graphql-tag'
// import _ from 'lodash'

export default function readPersonPublicationsConfSets (personPubIds) {
  const idsString = JSON.stringify(personPubIds)

  return gql`
      query MyQuery {
        confidencesets_persons_publications(
          distinct_on: persons_publications_id,
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          },
          where: {persons_publications_id: {_in: ${idsString}}}
        ) {
          id
          persons_publications_id
          person_id
          publication_id
          doi
          value
          datetime
        }
      }
    `
}
