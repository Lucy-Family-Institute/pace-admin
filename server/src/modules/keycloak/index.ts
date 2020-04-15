import KcAdminClient from 'keycloak-admin'
import gql from 'graphql-tag'
import passport from 'passport'
import _ from 'lodash'

import { Request, Response, NextFunction } from 'express'
import { Strategy as KeycloakStrategy } from 'passport-keycloak-oauth2-oidc'

const registerUserGql = gql`
  mutation registerUser($authServerId: String!, $emailPrimary: String!) {
    insert_users(objects: {
      auth_serverx_id: $authServerId,
      email_primary: $emailPrimary,
    }) {
      returning {
        id
        auth_server_id
        email_primary
        display_full_name
      }
    }
  }
`

async function registerUser (client, authServerId: string, emailPrimary: string) {
  const response = await client.mutate({
    registerUserGql,
    variables: {
      authServerId,
      emailPrimary
    }
  })
  if (!response) {
    return null
  }
  return response.data.insert_users.returning[0]
}

async function getUserByEmail (client, email: string) {
  const response = await client.query({
    query: gql`
      query getUserByEmail($email: String!) {
        users(
          where: {
            primaryEmail: {
              _eq: $email
            }
          }
        ) {
          id
          primaryEmail
        }
      }
    `,
    variables: {
      email
    }
  })
  if (_.isEmpty(response.data.users)) {
    return null
  }
  return response.data.users[0]
}

async function init (options) {
  const app = options.app
  const client = options.client
  const sessions = options.middleware.sessions

  passport.use(
    'keycloak',
    new KeycloakStrategy({
      clientID: options.clientId,
      realm: options.realm,
      publicClient: 'false',
      clientSecret: options.clientSecret,
      sslRequired: 'none',
      authServerURL: options.authServerUrl,
      callbackURL: options.callbackUrl
    }, async (accesseToken, refreshToken, profile, done) => {
      const result = await getUserByEmail(client, profile.email)
      profile.databaseId = result.id
      done(null, profile)
    }
  ))

  app.get('/auth/keycloak', passport.authenticate('keycloak')) //{ scope: ['profile'] }))
  app.get(
    '/auth/keycloak/callback',
    passport.authenticate('keycloak', { failureRedirect: '/login' }),
    (req: Request, res:Response) => {
      // console.log(req.user)
      res.redirect('/')
    }
  )
  app.get('/login', (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.redirect('/auth/keycloak')
    }
    res.redirect('/')
  })
  app.get('/logout', (req: Request, res: Response) => {
    const url = `${options.authServerUrl}/realms/${options.realm}/protocol/openid-connect/logout?redirect_uri=${options.baseUrl}`
    req.logout()
    res.redirect(url)
  })
  app.get('/session', (req: Request, res: Response) => {
    const response = {}
    if (req.user) {
      response['databaseId'] = _.get(req.user, 'databaseId')
      response['name'] = _.get(req.user, 'name')
      response['email'] = _.get(req.user, 'email')
    }
    res.json(response)
  })
}

export default {
  init
}