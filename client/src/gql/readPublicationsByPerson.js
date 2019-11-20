import gql from 'graphql-tag'

export default function readPublicationsByPerson (id) {
  return {
    query: gql`
      query MyQuery ($person_id: Int!){
        publications(where: {persons_publications: {person_id: {_eq: $person_id}}}) {
          id
          title
          doi
        }
      }
    `,
    variables: {
      person_id: id
    }
  }
}
