class DataSourceConfig {
  secrets: {}

  constructor (secrets: {}) {
    this.secrets = secrets
  }
  // returns an internal secrets object with items like tokens or other related credentials
  getSecrets(): {} {
    return this.secrets
  }
}