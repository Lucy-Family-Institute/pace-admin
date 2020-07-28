import gql from 'graphql-tag'

export default function insertJournalsImpactFactors (impactFactors) {
  return {
    mutation: gql`
      mutation MyMutation($objects: [journals_impactfactors_insert_input!]!) {
        insert_journals_impactfactors(objects: $objects) {
          returning {
            id
            year
            journal_id
          }
        }
      }
    `,
    variables: {
      objects: impactFactors
    }
  }
}
