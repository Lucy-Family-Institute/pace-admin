import gql from 'graphql-tag'

export default function readPublicationsFromStartYear (startYear) {
  return {
    query: gql`
      query MyQuery ($startYear: Int!){
        publications (where: {year: {_gte: $startYear}}){
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
    `,
      variables: {
        startYear
      }
  }
}
