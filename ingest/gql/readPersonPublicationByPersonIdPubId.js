import gql from 'graphql-tag'

export default function readPersonPublicationByPersonIdPubId (personId, publicationId) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $publication_id: Int!){
        persons_publications(
          where: {
            person_id: {_eq: $person_id},
            publication_id: {_eq: $publication_id}
          },
          order_by: {confidence: asc}
        ) {
          confidence,
          id
        }
      }
    `,
    variables: {
      person_id: personId,
      publication_id: publicationId
    }
  }
}
