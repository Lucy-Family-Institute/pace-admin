import gql from 'graphql-tag'

export default function readPublicationsCSL () {
  return {
    query: gql`
      query MyQuery {
        publications (order_by: {id: desc}){
          id
          csl
          doi
        }
      }
    `
  }
}
