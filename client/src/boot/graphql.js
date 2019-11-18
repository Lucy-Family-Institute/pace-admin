import { ApolloClient } from 'apollo-client'
import VueApollo from 'vue-apollo'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'node-fetch'

export default ({ Vue, app }) => {
  const uri = process.env.API_END_POINT || 'http://localhost:8002/v1/graphql'
  const httpLink = createHttpLink({
    uri,
    fetch,
    headers: {
      'x-hasura-admin-secret': 'mysecret'
    }
  })

  // Create the apollo client
  const defaultClient = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache()
  })

  const apolloProvider = new VueApollo({ defaultClient })

  Vue.use(VueApollo)
  app.apolloProvider = apolloProvider
  return apolloProvider
}
