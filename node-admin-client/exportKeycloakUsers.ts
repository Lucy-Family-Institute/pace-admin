import dotenv from 'dotenv'
import { PaceClient, PaceClientConfig } from './src/client'

(async () => {
  dotenv.config({
    path: '../.env'
  })

  const config: PaceClientConfig = {
    keycloakServer: process.env.AUTH_SERVER_URL,
    keycloakUsername: process.env.KEYCLOAK_USERNAME,
    keycloakPassword: process.env.KEYCLOAK_PASSWORD,
    keycloakRealm: process.env.KEYCLOAK_REALM,
    graphqlEndpoint: process.env.GRAPHQL_END_POINT,
    hasuraAdminSecret: process.env.HASURA_SECRET
  }

  const client = new PaceClient(config)
  
  console.log(await client.keycloak.getAllUsers())
})()