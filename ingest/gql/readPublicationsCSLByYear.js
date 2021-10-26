import gql from 'graphql-tag'

export default function readPublicationsCSLByYear (year) {
  return {
    query: gql`
      query MyQuery ($year: Int!){
        publications (where: {year: {_gte: $year}}){
          id
          title
          doi
          year
          csl
          source_name
          source_id
        }
      }
    `,
      variables: {
        year
      }
  }
}
