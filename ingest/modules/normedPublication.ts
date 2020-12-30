// the normalized simple form of a publication across all sources
interface NormedPublication {
  search_family_name: string,
  search_given_name: string,
  abstract?: string
  title: string,
  journalTitle: string,
  journalIssn?: string,
  journalEIsssn?: string
  doi: string,
  publicationDate: string,
  publisher?: string,
  datasource_name: string,
  source_id?: string,
  source_metadata?: Object
}