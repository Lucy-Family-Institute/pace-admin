export default interface NormedAuthor {
  familyName: string
  givenNameInitial: string
  givenName: string
  affiliations: any[]
  sourceIds: {
    scopusAffiliationId?: string,
    semanticScholarIds?: string[],
    googleScholarId?: string[]
  }
}