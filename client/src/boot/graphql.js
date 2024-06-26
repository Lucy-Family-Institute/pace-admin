import { ApolloClient } from 'apollo-client'
import VueApollo from 'vue-apollo'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'cross-fetch'

export default ({ Vue, app }) => {
  const uri = process.env.GRAPHQL_END_POINT
  const httpLink = createHttpLink({
    uri,
    fetch,
    credentials: 'include'
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
