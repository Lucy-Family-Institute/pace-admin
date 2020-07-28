import gql from 'graphql-tag'

export default function readAwardsWoutFunder () {
  return {
    query: gql`
      query MyQuery {
        awards (where: {funder_id: {_is_null: true}}) {
          funder_award_identifier
          funder_id
          funder_name
          id
          subfunder_id
          source_name
          publication_id
        }
      }
    `
  }
}
