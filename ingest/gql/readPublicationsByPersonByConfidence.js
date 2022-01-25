import gql from 'graphql-tag'

export default function readPublicationsByPersonByConfidence (confidence) {
  return {
    query: gql`
    query MyQuery ($confidence: float8!){
      persons_publications(where: {confidence: {_gt: $confidence}}, 
      order_by: {publication: {doi: asc}, person: {family_name: asc, given_name: asc}}) {
        confidence
        id
        publication {
          doi
        }
        person {
          family_name
          given_name
          id
        }
      }
    }
    `,
    variables: {
      confidence: confidence
    }
  }
}
