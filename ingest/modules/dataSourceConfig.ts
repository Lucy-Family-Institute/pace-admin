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
  harvestFileBatchSize: number // the number of files to have in harvest folder if total files greater than this it will create multiple harvest dirs
  harvestThreadCount?: number
}