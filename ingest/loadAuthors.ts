import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'

const client = new ApolloClient({
  link: createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    headers: {
      'x-hasura-admin-secret': 'mysecret'
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main (): Promise<void> {
  const authors: any = await loadCsv({
    path: '../data/hcri_researchers_10_24_19.csv'
  })

  // insert institutions first
  const institutions = _.uniq(_.map(authors, 'institution'))
  console.log(institutions)

  const result = await client.mutate({
    mutation: gql`
      mutation InsertInstitutionMutation ($institutions:[institutions_insert_input!]!){
        insert_institutions(
          objects: $institutions
          on_conflict: {constraint: institutions_name_key, update_columns: name}
        ) {
          returning {
            id
            name
          }
        }
      }`,
    variables: {
      institutions: _.map(institutions, (i: string) => ({ name: i }))
    }
  })

  console.log(JSON.stringify(result.data))
  // get indexed id's for institutions, and update author list with id's for inserts

  const insertedInstitutions = result.data.insert_institutions.returning || []
  const institutionNameIdMap = _.reduce(insertedInstitutions, (obj, inst) => {
    if (inst.name && inst.id) { obj[inst.name] = inst.id }
    return obj
  }, {})
  // console.log(insertedInstitutions)
  // console.log(institutionNameIdMap)

  // now add authors
  const authorsWithIds = _.map(authors, author => {
    const obj = {
      family_name: author.family_name,
      given_name: author.given_name,
      email: author.email,
      position_title: author.position_title
    }
    if (institutionNameIdMap[author.institution]) {
      // eslint-disable-next-line 
      obj["institution_id"] = institutionNameIdMap[author.institution]
    }
    return obj
  })
  console.log(authorsWithIds)

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

  console.log(resultInsertAuthors)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
