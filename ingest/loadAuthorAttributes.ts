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
import updatePersonGoogleScholarId from './gql/updatePersonGoogleScholarId'
import updatePersonDates from './gql/updatePersonDates'
import updatePersonStartDateEndDateIsNull from './gql/updatePersonStartDateEndDateIsNull'
import { __EnumValue } from 'graphql'
import NormedPerson from './modules/normedPerson'

import dotenv from 'dotenv'
import DateHelper from './units/dateHelper'

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
  const dateHelper = DateHelper.createDateHelper()
  const authorsAttributes: any = await loadCsv({
    path: authorAttributeFilePath
  })

  // get the set of persons to add variances to
  const authors: NormedPerson[] = await NormedPerson.getAllNormedPersons(client)
  
  //create map of 'last_name, first_name' to array of related persons with same last name
  const personMap = _.transform(authors, function (result, value) {
    (result[NormedPerson.getNameKey(value.familyName, value.givenName)] || (result[NormedPerson.getNameKey(value.familyName, value.givenName)] = [])).push(value)
  }, {})

  console.log(`Person Map is: ${JSON.stringify(personMap, null, 2)}`)

  // is a map of person id's to an object of possible source id values
  let updateSourceIds = {}

  // now add author variances
  const insertAuthorVariances = []
  const sortedPersonDates = {}
  _.each(authorsAttributes, (author) => {
    let familyNameIndex = -1
    _.each(_.keys(author), (key, index) => {
      // console.log(`Key is ${key}, index is: ${index}`)
      if (key.includes('family_name')) {
        // console.log(`Setting family index to: ${index}`)
        familyNameIndex = index
      }
    })   
    const nameKey = NormedPerson.getNameKey(author[_.keys(author)[familyNameIndex]], author['given_name'])
    // console.log(`Person map is: ${JSON.stringify(_.keys(personMap).length, null, 2)}`)
    console.log(`Name key is: ${nameKey}`)
    const personId = personMap[nameKey][0].id
    if (personMap[nameKey] && personMap[nameKey].length > 0) {
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
      if (author['google_scholar_id']){
        if (!updateSourceIds[personId]){
          updateSourceIds[personId] = {}
        }
        // add multiples as array delimited by ';'
        let googleScholarId = _.split(author['google_scholar_id'], ';')
        googleScholarId = _.map(googleScholarId, (id) => {
          return _.trim(id)
        })
        updateSourceIds[personId]['googleScholarId'] = googleScholarId
      }
      if (author['name_variances']) {
        const existingNameVariances = personMap[nameKey][0].nameVariances
        const variancesByName = _.mapKeys(existingNameVariances, (variance) => {
          return NormedPerson.getNameKey(variance['family_name'], variance['given_name'])
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
          if (!variancesByName[NormedPerson.getNameKey(obj['family_name'], obj['given_name'])]) {
            console.log(`Staging insert Name Variance ${JSON.stringify(obj, null, 2)} for ${NormedPerson.getNameKey(author['family_name'], author['given_name'])}`)
            insertAuthorVariances.push(obj)
          } else {
            console.log(`Skipping Already Existing Name Variance '${obj['family_name']}, ${obj['given_name']}' for ${NormedPerson.getNameKey(author['family_name'], author['given_name'])}`)
          }
        })
      }
      // now do start and end dates
      // if start date not defined just set one likely older than pubs harvested
      const newStartDate: Date = (author['start_date'] ? dateHelper.getDateObject(author['start_date']) : dateHelper.getDateObject('2016-01-01'))
      const newEndDate: Date = (author['end_date'] ? dateHelper.getDateObject(author['end_date']) : undefined)
      const prevStartDate: Date = personMap[nameKey][0].startDate
      const prevEndDate: Date = personMap[nameKey][0].endDate
      const testNewStartDate = (newStartDate ? newStartDate.getTime() : undefined)
      const testNewEndDate = (newEndDate ? newEndDate.getTime() : undefined)
      const testPrevStartDate = (prevStartDate ? prevStartDate.getTime() : undefined)
      const testPrevEndDate = (prevEndDate ? prevEndDate.getTime() : undefined)
      if (testNewStartDate !== testPrevStartDate) {
        console.log(`Found different start date.  prev start: ${(prevStartDate ? prevStartDate.getTime() : undefined)} new start: ${(newStartDate ? newStartDate.getTime() : undefined)}, prev end: ${(prevEndDate ? prevEndDate.getTime(): undefined)} new end: ${(newEndDate? newEndDate.getTime() : undefined)}`)
      }
      if (testNewEndDate !== testPrevEndDate) {
        console.log(`Found different end date.  prev start: ${(prevStartDate ? prevStartDate.getTime() : undefined)} new start: ${(newStartDate ? newStartDate.getTime() : undefined)}, prev end: ${(prevEndDate ? prevEndDate.getTime(): undefined)} new end: ${(newEndDate? newEndDate.getTime() : undefined)}`)
      }
      if (testNewStartDate !== testPrevStartDate ||
           testNewEndDate !== testPrevEndDate) {
        if (!sortedPersonDates['update']) sortedPersonDates['update'] = {}
        sortedPersonDates['update'][nameKey] = author
      } else {
        if (!sortedPersonDates['nochange']) sortedPersonDates['nochange'] = []
        sortedPersonDates['nochange'][nameKey] = author
      }
    }
  })

  console.log(`Person list no change to dates needed: ${( sortedPersonDates['nochange'] ?  _.keys(sortedPersonDates['nochange']).length : 0)} of ${authorsAttributes.length}`)
  console.log(`Person list update to dates needed: ${(sortedPersonDates['update'] ? _.keys(sortedPersonDates['update']).length : 0)} of ${authorsAttributes.length}`)

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
  console.log(`Done updating semantic scholar ids for authors. Updated ${updatedSourceIds} authors.`)

  let updatedSourceIds1 = 0
  await pMap(_.keys(updateSourceIds), async (updatePersonId) => {
    const sourceIds = updateSourceIds[updatePersonId]
    if (sourceIds['googleScholarId']){
      const resultUpdateScholarId = await client.mutate(updatePersonGoogleScholarId(updatePersonId, sourceIds['googleScholarId']))
      updatedSourceIds1 += resultUpdateScholarId.data.update_persons.returning.length
    }
  }, { concurrency: 1 })
  console.log(`Done updating google scholar ids for authors. Updated ${updatedSourceIds1} authors.`)
  
  console.log('Begin updating start and end dates for authors...')
  // update existing members if dates changed
  let updatedCount = 0

  await pMap(_.keys(sortedPersonDates['update']), async (nameKey) => {
    const author: NormedPerson = sortedPersonDates['update'][nameKey]
    const newStartDate = (author['start_date'] ? dateHelper.getDateObject(author['start_date']) : dateHelper.getDateObject('2016-01-01'))
    const newEndDate = (author['end_date'] ? dateHelper.getDateObject(author['end_date']) : undefined)
    if (personMap[nameKey] && personMap[nameKey].length > 0) {
      const id = personMap[nameKey][0].id
      if (newEndDate) {
        console.log(`Updating person with id: ${id}, start date: ${newStartDate} with end date: ${newEndDate}`)
        const resultUpdatePersonDates = await client.mutate(updatePersonDates(id, newStartDate, (newEndDate ? newEndDate : undefined)))
        updatedCount += resultUpdatePersonDates.data.update_persons.returning.length
      } else {
        console.log(`Updating person with id: ${id}, with start date: ${newStartDate}, end date: null`)
        const resultUpdatePersonStartDates = await client.mutate(updatePersonStartDateEndDateIsNull(id, newStartDate))
        updatedCount += resultUpdatePersonStartDates.data.update_persons.returning.length
      }
    } else {
      console.log(`Warning no existing person found on update dates for nameKey: ${nameKey}, nothing updated`)
    }
  }, { concurrency: 1 })

  console.log(`Done updating start and end dates for authors. Updated ${updatedCount} authors.`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
