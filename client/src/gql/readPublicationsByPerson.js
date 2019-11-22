import gql from 'graphql-tag'

export default function readPublicationsByPerson (id) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!){
        publication(
          where: {
            persons_publications: {person_id: {_eq: $person_id}}
          },
          order_by: {persons_publications_aggregate: {avg: {confidence: asc}}}
        ) {
          id
          title
          doi
          persons_publications {
            confidence
          }
        }
      }
    `,
    variables: {
      person_id: id
    }
  }
}
