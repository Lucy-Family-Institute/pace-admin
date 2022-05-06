import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPublicationsAwards (publicationIds) {
  let pubIdString = ''
  // for now manually construct the string for ids in the array
  _.forEach(publicationIds, (value, index) => {
    if (index > 0) {
      pubIdString = `${pubIdString},`
    }
    pubIdString = `${pubIdString}"${value}"`
  })

  return gql`
    query MyQuery {
    publications(
      where: {
        id: {_in: [${pubIdString}]}
      }
    ){
      id
      doi
      title
      awards {
        id
        funder_award_identifier
        funder_name
        source_name
      }
    }
  }
  `
}
