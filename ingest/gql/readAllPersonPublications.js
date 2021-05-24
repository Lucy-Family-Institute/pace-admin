import gql from 'graphql-tag'

export default function readAllPersonPublications () {
  return {
    query: gql`
      query MyQuery {
        persons_publications(
          order_by: {person_id: asc}
        ) {
          publication_id
          person_id,
          id
        }
      }
    `
  }
}
