import dotenv from 'dotenv'
import { User, PaceClient, PaceClientConfig } from './src/client'
import { command as loadCsv } from '../ingest/units/loadCsv' 
import _ from 'lodash'

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
  let addCsvUsers

  if (process.env.ADD_USER_CSV_PATH) {
    addCsvUsers = await loadCsv(
      { path: process.env.ADD_USER_CSV_PATH
      }
    )
    console.log(`Loaded csv users: ${JSON.stringify(addCsvUsers, null, 2)}`)
  }
  
  if (addCsvUsers) {
    console.log(`Trying to add csv users ${JSON.stringify(addCsvUsers, null, 2)}...`)
    const users = _.map(addCsvUsers, (addUser) => {
      console.log(`Starting prep user ${addUser}`)
      let password = addUser['password']
      if (!password) {
        password = `${addUser['lastname']}!`
      }
      const user: User = {
        email: addUser['email'],
        firstName: addUser['firstname'],
        lastName: addUser['lastname'],
        password: password
      }
      console.log(`Prepping user: ${JSON.stringify(user, null, 2)}`)
      return user
    })
    await client.registerUsers(users)
  }
})()