import { ApolloClient } from 'apollo-client'
import VueApollo from 'vue-apollo'
import { createHttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'node-fetch'
import { setContext } from 'apollo-link-context'

export default ({ Vue, app }) => {
  const uri = process.env.GRAPHQL_END_POINT
  const httpLink = createHttpLink({
    uri,
    fetch
  })

  // We're using apollo-link-context to dynamically set the header
  const authLink = setContext((_) => {
    return {
      headers: {
        'x-hasura-admin-secret': 'mysecret'
      }
    }
    // Eventually this will like this
    // return {
    //   headers: {
    //     sessionID: store.getters['app/sessionId']
    //   }
    // }
  })

  // Create the apollo client
  const defaultClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
  })

  const apolloProvider = new VueApollo({ defaultClient })

  Vue.use(VueApollo)
  app.apolloProvider = apolloProvider
  return apolloProvider
}
