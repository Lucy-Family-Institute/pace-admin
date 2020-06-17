import gql from 'graphql-tag'

export default function updatePubJournal (doi, journalId) {
  return {
    mutation: gql`
      mutation MyMutation($doi: String!, $journal_id: Int!) {
        update_publications(where: {doi: {_eq: $doi}}, _set: {journal_id: $journal_id}) {
          returning {
            journal_id
            doi
            id
            source_name
            title
            year
            source_metadata
          }
        }
      }
    `,
    variables: {
      doi,
      journal_id: journalId
    }
  }
}
