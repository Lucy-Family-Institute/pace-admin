import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPersons from '../client/src/gql/readPersons'
import { __EnumValue } from 'graphql'

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

async function getAllSimplifiedPersons () {
  const queryResult = await client.query(readPersons())

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: person.family_name.toLowerCase(),
      firstInitial: person.given_name[0].toLowerCase(),
      firstName: person.given_name.toLowerCase(),
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

function getNameKey (lastName, firstName) {
  return `${_.toLower(lastName)}, ${_.toLower(firstName)}`
}

async function main (): Promise<void> {
  const authorsWithVariances: any = await loadCsv({
    path: '../data/hcri_researchers_2017-2019_load_name_variances.csv'
  })

  // get the set of persons to add variances to
  const authors = await getAllSimplifiedPersons()
  //create map of 'last_name, first_name' to array of related persons with same last name
  const personMap = _.transform(authors, function (result, value) {
    (result[getNameKey(value.lastName, value.firstName)] || (result[getNameKey(value.lastName, value.firstName)] = [])).push(value)
  }, {})

  console.log(`Person Map is: ${JSON.stringify(personMap, null, 2)}`)

  // // assume exact form name as in database for now, and create similar map
  // const varianceNameMap = _.transform(authors, function (result, value) {
  //   (result[getNameKey(value['family_name'], value['given_name'])] || (result[getNameKey(value['family_name'], value['given_name'])] = [])).push(value)
  // }, {})

  // now add author variances
  const insertAuthorVariances = _.transform(authorsWithVariances, (result, author) => {
    console.log(`Trying to create name variance objects for: ${JSON.stringify(author, null, 2)}`)
    const nameKey = getNameKey(author['family_name'], author['given_name'])
    console.log(`Name Key is: ${nameKey}`)
    if (personMap[nameKey] && author['name_variances']) {
      console.log('here')
      const personId = personMap[getNameKey(author['family_name'], author['given_name'])][0].id
      const nameVariances = author['name_variances'].split(';')
      _.each(nameVariances, (nameVariance) => {
        let obj = {}
        obj['person_id'] = personId
        
        const nameParts = nameVariance.split(',')
        const lastName = nameParts[0].trim()
        obj['family_name'] = lastName
        // set first name to blank if nothing there
        obj['given_name'] = ''
        if (nameParts[1]) {
          obj['given_name'] = nameParts[1].trim()
        }
        console.log(`Created insert name var obj: ${JSON.stringify(obj, null, 2)}`)
        // push the object into the array of rows to insert later
        result.push(obj)
      })
    }
  }, [])
   
  console.log(JSON.stringify(insertAuthorVariances, null, 2))

  const resultInsertNameVariances = await client.mutate({
    mutation: gql`
      mutation InsertPersonNameVarianceMutation ($persons:[persons_namevariances_insert_input!]!){
        insert_persons_namevariances(
          objects: $persons
        ) {
          returning {
            id,
            person_id,
            given_name,
            family_name
          }
        }
      }`,
    variables: {
      persons: insertAuthorVariances
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
