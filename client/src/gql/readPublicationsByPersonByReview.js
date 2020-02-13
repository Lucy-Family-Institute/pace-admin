import gql from 'graphql-tag'

export default function readPublicationsByPersonReview (personId, userId) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!, $user_id: Int!){
        persons_publications(where: {person_id: {_eq: $person_id}}) {
          id
          person_id
          publication_id
          publication {
            title
            doi
          }
          confidence
          reviews(order_by: {datetime: desc}, limit: 1, , where: {user_id: {_eq: $user_id}}) {
            id
            reviewstate {
              abbrev,
              name
            }
          }
        }
      }
    `,
    variables: {
      person_id: personId,
      user_id: userId
    }
  }
}
