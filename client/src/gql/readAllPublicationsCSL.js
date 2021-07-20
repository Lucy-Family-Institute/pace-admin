import gql from 'graphql-tag'
import _ from 'lodash'

export default function readAllPublicationsCSL () {
  return gql`
    query MyQuery {
    publications {
      id
      doi
      csl
    }
  }
  `
}
