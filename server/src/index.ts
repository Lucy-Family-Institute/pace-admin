import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import proxy from 'express-http-proxy'
import dotenv from 'dotenv'

import { createAdminClient } from './graphqlClient'

import { loadModule } from './modules/'
import sessions from './modules/redisSessions/'
import passportModule from './modules/passport/'
import keycloakModule from './modules/keycloak/'
import hasuraModule from './modules/hasura/'
// import staticModule from './modules/static/'

dotenv.config({ path: '../.env' })

const adminClient = createAdminClient(process.env.HASURA_SECRET)

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

async function main () {
  try {
    loadModule('sessions', sessions, app, {
      name: process.env.SESSION_NAME,
      secret: process.env.SESSION_SECRET
    })
    loadModule('passport', passportModule, app, {})
    loadModule('keycloak', keycloakModule, app, {
      client: adminClient,
      port: process.env.KEYCLOAK_PORT,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      realm: process.env.KEYCLOAK_REALM,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      authServerUrl: `${process.env.AUTH_SERVER_URL}`,
      callbackUrl: process.env.AUTH_CALLBACK_URL,
      sessionName: process.env.SESSION_NAME,
      baseUrl: process.env.APP_BASE_URL
    })
    loadModule('hasura', hasuraModule, app, {
      secret: process.env.HASURA_SECRET
    })

    const port:number = parseInt(process.env.EXPRESS_PORT)
    app.listen(port, '0.0.0.0', () =>
      console.log(`Open the proxy at ${process.env.NGINX_PORT}`)
    )
  } catch (err) {
    console.log(err)
  }
}

// tslint:disable-next-line: no-floating-promises
main()
