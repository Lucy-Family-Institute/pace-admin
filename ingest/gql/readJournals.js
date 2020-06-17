import gql from 'graphql-tag'

export default function readJournals () {
  return {
    query: gql`
      query MyQuery {
        journals {
          id
          title
          publisher
          issn
          e_issn
          journal_type
        }
      }
    `
  }
}
