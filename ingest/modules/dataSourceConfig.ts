export default interface DataSourceConfig {
  baseUrl: string
  queryUrl: string
  authorUrl?: string
  publicationUrl?: string
  apiKey?: string
  userName?: string
  password?: string
  sourceName: string
  pageSize: string
  harvestYears?: Number[]
  requestInterval: Number
  memberFilePath?: string
  harvestDataDir: string
  batchSize: number
}