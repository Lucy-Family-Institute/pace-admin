import dotenv from 'dotenv'
import { DBUser, User, UserOrg, UserRole, PaceClient, PaceClientConfig } from './src/client'
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
    let userRoles = []
    let addUserOrgsByEmail = {}
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
      const userRole: UserRole = {
        email: addUser['email'],
        role: addUser['role']
      }
      userRoles.push(userRole)
      if (addUser['organizations'] && addUser['organizations'].length > 0){
        addUserOrgsByEmail[addUser['email']] = addUser['organizations']
      }
      return user
    })
    await client.registerUsers(users)

    console.log(`Trying to add user roles...`)
    await client.registerUserRoles(userRoles)    
    console.log(`Finished adding users and roles.`)

    // now add user orgs
    console.log(`Trying to add user orgs...`)
    // select users and existing user orgs
    const dbUsers: DBUser[] = await client.getDBUsers()
    // match email to user
    const usersByEmail = _.mapKeys(dbUsers, (dbUser: DBUser) => {
      return dbUser.email
    })
    // construct userid and org objects
    let insertUserOrgs: UserOrg[] = []
    _.each(_.keys(addUserOrgsByEmail), (email) => {
      if (usersByEmail[email]){
        const dbUser: DBUser = usersByEmail[email]
        const addUserOrgs = _.split(addUserOrgsByEmail[email], ';')
        _.each(addUserOrgs, (addOrg) => {
          const userOrg: UserOrg = {
            userId: dbUser.id,
            org: addOrg
          }
          insertUserOrgs.push(userOrg)
        })
      } else {
        console.log(`Warning skipping add user org not in DB email: '${email}'', orgs: '${addUserOrgsByEmail[email]}'`)
      }
    })
    await client.registerUserOrgs(insertUserOrgs)
    console.log(`Finished adding orgs.`)
  }
})()