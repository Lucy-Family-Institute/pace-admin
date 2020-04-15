import _ from 'lodash'
// import gql from 'graphql-tag'
// import fs from 'fs-extra'
import fetch from 'node-fetch'
import ApolloClient from 'apollo-client'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

export function createAdminClient (secret: string) {
  const headers = {
    'x-hasura-admin-secret': secret
  }

  headers['X-Hasura-Role'] = 'admin'

  const link = createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    fetch: fetch as any,
    headers
  })

  return new ApolloClient({
    link,
    cache: new InMemoryCache()
  })
}

export function createClient (secret: string, userId: number) {
  const headers = {
    'x-hasura-admin-secret': secret
  }

  let role = 'anonymous_user'
  if (userId) {
    role = 'user'
    headers['X-Hasura-User-Id'] = userId
  }
  headers['X-Hasura-Role'] = role

  const link = createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    fetch: fetch as any,
    headers
  })

  return new ApolloClient({
    link,
    cache: new InMemoryCache()
  })
}

// const cache = {}

// export async function adminQuery (
//   path: string,
//   variables?: object
// ) {
//   // logger.debug('Running Admin Query')
//   if (cache[path] === undefined) {
//     const fileContent = await fs.readFile(path)
//     cache[path] = gql`${fileContent}`
//   }
//   const response = await adminClient.query({
//     query: cache[path],
//     variables
//   })
//   return _.first(_.values(response.data))
// }

// export async function adminMutate (
//   path: string,
//   variables?: object
// ) {
//   // logger.debug('Running Admin Mutate')
//   if (cache[path] === undefined) {
//     const fileContent = await fs.readFile(path)
//     cache[path] = gql`${fileContent}`
//   }
//   const response = await adminClient.mutate({
//     mutation: cache[path],
//     variables
//   })
//   return _.first(_.values(response.data))
// }

// export default client
