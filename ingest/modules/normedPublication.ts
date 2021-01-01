// the normalized simple form of a publication across all sources
interface NormedPublication {
  search_person?: NormedPerson,
  abstract?: string
  title: string,
  journalTitle: string,
  journalIssn?: string,
  journalEIssn?: string
  doi: string,
  publicationDate: string,
  datasource_name: string,
  source_id?: string,
  source_metadata?: Object
}