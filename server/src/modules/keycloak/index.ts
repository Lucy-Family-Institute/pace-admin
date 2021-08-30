import { gql } from '@apollo/client/core'
import passport from 'passport'
import _ from 'lodash'

import { Request, Response, NextFunction } from 'express'
import { Strategy as KeycloakStrategy } from 'passport-keycloak-oauth2-oidc'

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
      try {
        const result = await getUserByEmail(client, profile.email)
        profile.databaseId = result.id
      } catch (error) {
        console.error ('Is your user in both keycloak and the hasura database?', error)
      }
      done(null, profile)
    }
  ))

  // passport.authenticate('keycloak')
  app.get('/keycloak', (req, res) => res.redirect('/login')) //{ scope: ['profile'] }))
  app.get(
    '/keycloak/callback',
    passport.authenticate('keycloak', { failureRedirect: '/login' }),
    (req: Request, res:Response) => {
      res.redirect('/')
    }
  )
  app.get('/login', (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.redirect(`${process.env.APP_BASE_URL}/auth/realms/pace/protocol/openid-connect/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fkeycloak%2Fcallback&client_id=client`)
    }
    res.redirect('/')
  })
  app.get('/logout', (req: Request, res: Response) => {
    const url = `${process.env.APP_BASE_URL}/auth/realms/${options.realm}/protocol/openid-connect/logout?redirect_uri=${options.baseUrl}`
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