import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPublicationsJournals (publicationIds) {
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
      journal {
        title
        journal_type
        journals_classifications {
          classification {
            identifier
            name
          }
        }
        journals_impactfactors {
          year
          impactfactor
        }
        publisher
      }
    }
  }
  `
}
