import gql from 'graphql-tag'

export default function readJournalsImpactFactors () {
  return {
    query: gql`
      query MyQuery {
        journals_impactfactors {
          year
          impactfactor
          id
          journal_id
        }
      }
    `
  }
}
