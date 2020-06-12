import gql from 'graphql-tag'
import _ from 'lodash'

export default function readAuthorsByPublications (publicationIds) {
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
      authors: csl(path: "author")
    }
  }
  `
}
