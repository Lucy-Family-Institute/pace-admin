import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'

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
    path: '../data/hcri_researchers_2017-2019.csv'
  })

  // insert institutions first
  const institutions = _.uniq(_.map(authors, 'institution'))
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
      institutions: _.map(institutions, (i: string) => ({ name: i }))
    }
  })

  // get indexed id's for institutions, and update author list with id's for inserts
  const insertedInstitutions = result.data.insert_institutions.returning || []
  const institutionNameIdMap = _.reduce(insertedInstitutions, (obj, inst) => {
    if (inst.name && inst.id) { obj[inst.name] = inst.id }
    return obj
  }, {})

  // now add authors
  const authorsWithIds = _.map(authors, author => {
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
