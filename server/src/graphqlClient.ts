import _ from 'lodash'
import fetch from 'node-fetch'
import { ApolloClient, InMemoryCache, gql, HttpLink, NormalizedCacheObject} from '@apollo/client/core'

export const cache: InMemoryCache = new InMemoryCache({})

export function createAdminClient (secret: string) {
  const headers = {
    'x-hasura-admin-secret': secret,
    'x-hasura-role': 'admin'
  }

  return new ApolloClient({
    cache: new InMemoryCache({}),
    link: new HttpLink({
      uri: process.env.GRAPHQL_END_POINT,
      fetch,
      headers
    })
  })
}