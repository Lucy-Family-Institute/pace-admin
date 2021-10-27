import { ApolloClient, gql, HttpLink, NormalizedCacheObject} from '@apollo/client'
import fetch from 'cross-fetch'
import _ from 'lodash'
import { KeycloakClient } from "./keycloak"
import { cache } from './cache'

export interface User {
  email: string,
  firstName: string,
  lastName: string,
  password: string
}

export interface UserRole {
  email: string,
  role: string
}

export interface PaceClientConfig {
  keycloakServer: string
  keycloakUsername: string
  keycloakPassword: string
  keycloakRealm: string
  graphqlEndpoint: string
  hasuraAdminSecret: string
}

export class PaceClient {
  keycloak: KeycloakClient
  apolloClient: ApolloClient<NormalizedCacheObject>

  constructor(config: PaceClientConfig) {
    
    this.keycloak = new KeycloakClient({
      server: config.keycloakServer,
      username: config.keycloakUsername,
      password: config.keycloakPassword,
      realm: config.keycloakRealm
    })

    this.apolloClient = new ApolloClient({
      cache,
      link: new HttpLink({
        uri: config.graphqlEndpoint,
        fetch,
        headers: {
          'x-hasura-admin-secret': config.hasuraAdminSecret
        }
      })
    })
  }

  public async getDatabaseUser ( email: string ) {
    const results = await this.apolloClient.mutate({
      mutation: gql`
        mutation MyQuery ($email: String!) {
          users (object: {primaryEmail: {_eq: $email}}) {
            id
            primaryEmail
          }
        }
      `,
      variables: {
        email
      }
    })
    if (results.data.users.length === 1) {
      return results.data.users[0]
    }
    return null
  }

  public async registerUserRoles (userRoles: UserRole[]) {
    console.log(`Starting loop to add ${userRoles.length} user roles`)
    for (let index = 0; index < userRoles.length; index++) {
      const userRole = userRoles[index];
      await this.registerUserRole(userRole)
    }
  }


  public async registerUserRole ( userRole: UserRole ): Promise<void> {
    console.log(`Trying to add`, userRole)
    try {
      await this.apolloClient.mutate({
        mutation: gql`
          mutation MyMutation ($email: String!, $role: users_roles_enum!) {
            update_users (where: {primaryEmail: {_eq: $email}}, _set: {role: $role}) {
              returning {
                primaryEmail
                role
              }
            }

          }
        `,
        variables: {
          email: userRole.email,
          role: userRole.role
        }
      })
      console.log(`Added User Role user: '${userRole.email}' role: '${userRole.role}'`)
    } catch (error) {
      const errorCode = _.get(error, ['graphQLErrors', 'extensions', 'code'])
      console.log(`Error on register user '${userRole.email}' role '${userRole.role}': error - ${JSON.stringify(error.message, null, 2)}`)
      if (errorCode === 'constraint-violation') {
        throw error
      }
    }
  }

  public async registerUsers (users: User[]) {
    console.log(`Starting loop to add ${users.length} users`)
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      await this.registerUser(user)
      console.log(`Registered user: ${user.email}`)
    }
  }

  public async registerUser( user: User ): Promise<void> {
    console.log(`Trying to add`, user)
    await this.keycloak.getOrRegisterUser(user)
    try {
      await this.apolloClient.mutate({
        mutation: gql`
          mutation MyMutation ($email: String!) {
            insert_users_one(object: {primaryEmail: $email}) {
              id
            }
          }
        `,
        variables: {
          email: user.email
        }
      })
    } catch (error) {
      const errorCode = _.get(error, ['graphQLErrors', 'extensions', 'code'])
      console.log(`User '${user.email}' not added: error message - ${JSON.stringify(error.message, null, 2)}`)
      if (errorCode === 'constraint-violation') {
        throw error
      }
    }
  }
}