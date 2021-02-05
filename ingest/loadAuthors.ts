import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import { getAllSimplifiedPersons, getNameKey } from './modules/queryNormalizedPeople'
import readInstitutions from './gql/readInstitutions'


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
  const authors: any = await loadCsv({
    path: '../data/hcri_researchers_2017-2020.csv'
  })

  // check for existing authors
  // get the set of persons to add variances to
  const authorsExisting = await getAllSimplifiedPersons(client)

  //group the authors by lastname and firstname
  const authorsByName = _.mapKeys(authorsExisting, (author) => {
    return getNameKey(author['lastName'], author['firstName'])
  })

  console.log(`Authors by name: ${_.keys(authorsByName)}`)

  const insertAuthors = []
  _.each(authors, (author) => {
    const key = getNameKey(author['family_name'], author['given_name'])
    console.log(`Checking author: ${key}`)
    if (!authorsByName[key]){
      console.log(`Author ${key} not found yet, will add to list to insert`)
      insertAuthors.push(author)
    } else {
      console.log(`Author ${key} found, will skip insert`)
    }
  })

  // check for existing institutions
  const result = await client.query(readInstitutions())
  let existingInst = result.data.institutions

  const instByName = _.groupBy(existingInst, (inst) => {
    return inst['name']
  })

  // insert institutions first
  const institutions = _.uniq(_.map(insertAuthors, 'institution'))
  console.log(`Institutions for add authors ${JSON.stringify(institutions)}`)
  console.log(`Existing Institutions ${JSON.stringify(existingInst)}`)


  const insertInst = []
  _.each(institutions, (institution) => {
    if (!instByName[institution]){
      insertInst.push(institution)
    }
  })

  console.log(`Insert Authors: ${insertAuthors.length}`)
  console.log(`Insert Inst: ${JSON.stringify(insertInst, null, 2)}`)

  if (insertInst.length > 0){
    const result = await client.mutate({
      mutation: gql`
        mutation InsertInstitutionMutation ($institutions:[institutions_insert_input!]!){
          insert_institutions(
            objects: $institutions
            on_conflict: {constraint: institutions_pkey, update_columns: name}
          ) {
            returning {
              id
              name
            }
          }
        }`,
      variables: {
        institutions: _.map(insertInst, (i: string) => ({ name: i }))
      }
    })

    // get indexed id's for institutions, and update author list with id's for inserts
    const insertedInstitutions = result.data.insert_institutions.returning || []
    existingInst = _.concat(existingInst, insertedInstitutions)
  }

  const institutionNameIdMap = _.reduce(existingInst, (obj, inst) => {
    if (inst.name && inst.id) { obj[inst.name] = inst.id }
    return obj
  }, {})

  // now add authors
  const authorsWithIds = _.map(insertAuthors, author => {
    const obj = _.pick(author, ['family_name', 'given_name', 'email', 'position_title'])
    if (institutionNameIdMap[author.institution]) {
      // eslint-disable-next-line 
      obj["institution_id"] = institutionNameIdMap[author.institution]
    }
    if (author.start_date) {
      // eslint-disable-next-line 
      obj["start_date"] = new Date(author.start_date)
    }
    if (author.end_date) {
      // eslint-disable-next-line 
      obj["end_date"] = new Date(`12/31/${author.end_date}`)
    }
    return obj
  })
  console.log(authorsWithIds[0])

  const resultInsertAuthors = await client.mutate({
    mutation: gql`
      mutation InsertPersonMutation ($persons:[persons_insert_input!]!){
        insert_persons(
          objects: $persons
        ) {
          returning {
            id,
            given_name,
            family_name,
            email,
            position_title,
            start_date,
            end_date,
            institution {
              name
            }
          }
        }
      }`,
    variables: {
      persons: authorsWithIds
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
