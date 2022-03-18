import gql from 'graphql-tag'

export default function readPublicationsYearNull () {
  return {
    query: gql`
      query MyQuery {
        publications (where: {
            year: {_is_null: true}
        }){
          id
          title
          doi
          year
          month
          day
          csl
          source_name
        }
      }
    `
  }
}
