import gql from 'graphql-tag'

export default function insertPersonPublication (personId, publicationId, confidence) {
  return {
    mutation: gql`
      mutation MyMutation($person_id: Int!, $publication_id: Int!, $confidence: float8!) {
        insert_persons_publications(objects: {
          person_id: $person_id, 
          publication_id: $publication_id, 
          confidence: $confidence
        }){
          returning {
            id
          }
        }
      }
    `,
    variables: {
      person_id: personId,
      publication_id: publicationId,
      confidence: confidence
    }
  }
}
