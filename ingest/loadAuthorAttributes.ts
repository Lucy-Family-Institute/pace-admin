import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import pMap from 'p-map'
import _, { update } from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPersons from './gql/readPersons'
import updatePersonSemanticScholarIds from './gql/updatePersonSemanticScholarIds'
import { __EnumValue } from 'graphql'
import { getAllSimplifiedPersons, getNameKey } from './modules/queryNormalizedPeople'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const authorAttributeFilePath = process.env.INGESTER_AUTHOR_ATTRIBUTES_FILE

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
  const authorsWithVariances: any = await loadCsv({
    path: authorAttributeFilePath
  })

  // get the set of persons to add variances to
  const authors = await getAllSimplifiedPersons(client)
  
  //create map of 'last_name, first_name' to array of related persons with same last name
  const personMap = _.transform(authors, function (result, value) {
    (result[getNameKey(value.lastName, value.firstName)] || (result[getNameKey(value.lastName, value.firstName)] = [])).push(value)
  }, {})

  console.log(`Person Map is: ${JSON.stringify(personMap, null, 2)}`)

  // is a map of person id's to an object of possible source id values
  let updateSourceIds = {}

  // now add author variances
  const insertAuthorVariances = _.transform(authorsWithVariances, (result, author) => {
    let familyNameIndex = -1
    _.each(_.keys(author), (key, index) => {
      // console.log(`Key is ${key}, index is: ${index}`)
      if (key.includes('family_name')) {
        // console.log(`Setting family index to: ${index}`)
        familyNameIndex = index
      }
    })   
    const nameKey = getNameKey(author[_.keys(author)[familyNameIndex]], author['given_name'])
    // console.log(`Person map is: ${JSON.stringify(_.keys(personMap).length, null, 2)}`)
    console.log(`Name key is: ${nameKey}`)
    const personId = personMap[nameKey][0].id
    if (personMap[nameKey]) {
      if (author['semantic_scholar_id']){
        if (!updateSourceIds[personId]){
          updateSourceIds[personId] = {}
        }
        // add multiples as array delimited by ';'
        let semanticScholarIds = _.split(author['semantic_scholar_id'], ';')
        semanticScholarIds = _.map(semanticScholarIds, (id) => {
          return _.trim(id)
        })
        updateSourceIds[personId]['semanticScholarIds'] = semanticScholarIds
      }
      if (author['name_variances']) {
        const existingNameVariances = personMap[nameKey][0].nameVariances
        const variancesByName = _.mapKeys(existingNameVariances, (variance) => {
          return getNameKey(variance['family_name'], variance['given_name'])
        })
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
          
          // push the object into the array of rows to insert later
          // check if name variance object already exists and if so skip
          // console.log(`Existing variances: ${JSON.stringify(existingNameVariances, null, 2)}`)
          // console.log(`Current variances: ${JSON.stringify(variancesByName, null, 2)}`)
          if (!variancesByName[getNameKey(obj['family_name'], obj['given_name'])]) {
            console.log(`Staging insert Name Variance ${JSON.stringify(obj, null, 2)} for ${getNameKey(author['family_name'], author['given_name'])}`)
            result.push(obj)
          } else {
            console.log(`Skipping Already Existing Name Variance '${obj['family_name']}, ${obj['given_name']}' for ${getNameKey(author['family_name'], author['given_name'])}`)
          }
        })
      } 
    }
  }, [])

  console.log(`Staging ${insertAuthorVariances.length} Name Variances for Insert`)

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

  console.log(`Inserted ${resultInsertNameVariances.data.insert_persons_namevariances.returning.length} name variances`)
  console.log(`Updating other attributes for authors...`)
  let updatedSourceIds = 0
  await pMap(_.keys(updateSourceIds), async (updatePersonId) => {
    const sourceIds = updateSourceIds[updatePersonId]
    if (sourceIds['semanticScholarIds']){
      const resultUpdateScholarId = await client.mutate(updatePersonSemanticScholarIds(updatePersonId, sourceIds['semanticScholarIds']))
      updatedSourceIds += resultUpdateScholarId.data.update_persons.returning.length
    }
  }, { concurrency: 1 })
  console.log(`Done updating other attributes for authors. Updated ${updatedSourceIds} authors.`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
