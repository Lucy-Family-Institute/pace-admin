// the normalized simple form of a publication across all sources
interface NormedPublication {
  searchPerson?: NormedPerson,
  abstract?: string,
  title: string,
  journalTitle: string,
  journalIssn?: string,
  journalEIssn?: string,
  doi: string,
  publicationDate: string,
  datasourceName: string,
  sourceId?: string,
  sourceMetadata?: Object
}