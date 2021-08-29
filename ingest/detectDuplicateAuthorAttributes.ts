import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import pMap from 'p-map'
import _, { update } from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPersons from '../client/src/gql/readPersons'
import updatePersonSemanticScholarIds from './gql/updatePersonSemanticScholarIds'
import { __EnumValue } from 'graphql'
import { getAllSimplifiedPersons, getNameKey } from './modules/queryNormalizedPeople'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main (): Promise<void> {
  // const authorsWithVariances: any = await loadCsv({
  //   path: '../data/input/researchers_2017-2020_attributes.csv'
  // })

  // get the set of persons to add variances to
  const authors = await getAllSimplifiedPersons(client)
  
  //create map of 'last_name, first_name' to array of related persons with same last name
  const personMap = _.transform(authors, function (result, value) {
    (result[getNameKey(value.lastName, value.firstName)] || (result[getNameKey(value.lastName, value.firstName)] = [])).push(value)
  }, {})

  _.each(_.keys(personMap), (nameKey) => {
    const person = personMap[nameKey]
    const groupedNameVariances = _.groupBy(person[0]['nameVariances'], (variance) => {
      let familyName = _.trim(variance.family_name)
      let givenName = _.trim(variance.given_name)
      // reduce any spaces to one
      familyName = familyName.replace(/\s\s+/g, ' ')
      givenName = givenName.replace(/\s\s+/g, ' ')
      return getNameKey(familyName, givenName)
    })
    _.each(_.keys(groupedNameVariances), (key) => {
      if (groupedNameVariances[key].length > 1) {
        console.log(`Duplicate variance entries found for ${nameKey}: ${JSON.stringify(groupedNameVariances[key], null, 2)}`)
      }
    })
  })
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
