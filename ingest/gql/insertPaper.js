import gql from 'graphql-tag'

export default function insertPaper (personId, title, doi) {
  return {
    mutation: gql`
      mutation MyMutation($person_id: Int!, $title: String!, $doi: String!) {
        insert_publications(objects: {doi: $doi, title: $title, persons_publications: {data: {person_id: $person_id}}}) {
          returning {
            id
          }
        }
      }
    `,
    variables: {
      person_id: personId,
      title,
      doi
    }
  }
}
