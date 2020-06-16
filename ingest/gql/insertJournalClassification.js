import gql from 'graphql-tag'

export default function insertJournalClassification (journalClassifications) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [journals_classifications_insert_input!]!) {
        insert_journals_classifications(objects: $objects){
          returning {
            id
            journal_id
            classification_id
          }
        }
      }
    `,
    variables: {
      objects: journalClassifications
    }
  }
}