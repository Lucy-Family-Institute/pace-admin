import gql from 'graphql-tag'

export default function readPublicationsCSLById (ids) {
  const idsString = JSON.stringify(ids)
  return {
    query: gql`
      query MyQuery {
        publications (
          order_by: {
            id: asc
          },
          where: {
            id: {_in: ${idsString}}
          }
        ){
          id
          title
          doi
          year
          csl
          source_metadata
          source_name
          source_id
        }
      }
    `
  }
}