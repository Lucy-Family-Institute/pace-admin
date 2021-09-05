import { ApolloClient /*, createHttpLink */ } from '@apollo/client/core'
import { ApolloClients } from '@vue/apollo-composable'
import { boot } from 'quasar/wrappers'
import { getClientOptions } from 'src/apollo'
export default boot(
  /* async */ ({ app }) => {
    const options = /* await */ getClientOptions(/* {app, router ...} */)
    const apolloClients = {
      default: new ApolloClient(options)
    }
    app.provide(ApolloClients, apolloClients)
    app.config.globalProperties.$apollo = apolloClients.default
  }
)
