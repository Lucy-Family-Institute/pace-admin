import KcAdminClient from '@keycloak/keycloak-admin-client'
import UserRepresentation from 'keycloak-admin/lib/defs/userRepresentation'

export interface KeycloakClientConfig {
  server: string
  username: string
  password: string
  realm: string
}

export interface ResetPasswordConfig {
  id?: string
  email?: string
  password: string
}

export interface RegistrationConfig {
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  ignoreCheckForExistingUser?: boolean
  enabled?: boolean,
  emailVerified?: boolean
}

export interface GetUserConfig {
  email: string
}

export class KeycloakClient {

  public client: KcAdminClient
  private readonly realm: string
  private readonly username: string
  private readonly password: string
  private isAuthenticated: boolean = false

  constructor (config: KeycloakClientConfig) {
    this.client = new KcAdminClient(
      {
        baseUrl: config.server,
        realmName: 'master'
      }
    )
    this.realm = config.realm
    this.username = config.username
    this.password = config.password
  }

  async authenticate (): Promise<any> {
    if (this.isAuthenticated) return true

    const response = await this.client.auth({
      username: this.username,
      password: this.password,
      grantType: 'password',
      clientId: 'admin-cli',
      totp: '123456', // optional Time-based One-time Password if OTP is required in authentication flow
    })
    this.isAuthenticated = true
    return this.isAuthenticated
  }

  public async getUser (config: GetUserConfig): Promise<UserRepresentation> {
    const { email } = config

    const query = {
      realm: this.realm,
      email
    }
    await this.authenticate()
    const users: any[] = await this.client.users.find(query)

    if (users.length === 1) return users[0]

    if (users.length > 1) throw new Error('email should be unique but found more than one')

    return null
  }

  public async getAllUsers () {
    await this.authenticate()
    const users: any[] = await this.client.users.find({ realm: this.realm })
    return users
  }

  public async registerUser (config: RegistrationConfig): Promise<UserRepresentation> {
   config = {
      ...config,
      ignoreCheckForExistingUser: false,
      enabled: true,
      emailVerified: true
    }

    let user
    if (config.ignoreCheckForExistingUser) {
      user = await this.getUser({ email: config.email })

      if (user) {
        throw new Error(`${config.email} already registered`)
      }
    }

    const { email, firstName, lastName, enabled, emailVerified } = config

    user = await this.client.users.create({
      username: email,
      email,
      firstName,
      lastName,
      enabled,
      emailVerified,
      realm: this.realm
    })

    await this.resetUserPassword({
      id: user.id,
      password: config.password
    })

    return await this.getUser({ email })
  }

  public async getOrRegisterUser (config: RegistrationConfig): Promise<UserRepresentation> {
    const user = await this.getUser({ email: config.email })
    if (user) return user
    return this.registerUser({
      ...config,
      ignoreCheckForExistingUser: true
    })
  }

  public async resetUserPassword (config: ResetPasswordConfig): Promise<boolean> {
    if (!(config.id || config.email)) {
      throw new Error('Requires id or email')
    }

    if (!config.id && config.email) {
      const user: UserRepresentation = await this.getUser({ email: config.email })
      config.id = user.id
    } else {
      await this.authenticate()
    }

    await this.client.users.resetPassword({
      realm: this.realm,
      id: config.id,
      credential: {
        temporary: false,
        type: 'password',
        value: config.password
      }
    })

    return true
  }
}
