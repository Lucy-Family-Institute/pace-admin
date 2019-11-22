import gql from 'graphql-tag'

export default function insertPaper (personId, title, doi, confidence) {
  return {
    mutation: gql`
      mutation MyMutation($person_id: Int!, $title: String!, $doi: String!, $confidence: float8!) {
        insert_publication(objects: {doi: $doi, title: $title, 
          persons_publications: {
            data: {
              person_id: $person_id
              confidence: $confidence
            }}}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      person_id: personId,
      title,
      doi,
      confidence
    }
  }
}
