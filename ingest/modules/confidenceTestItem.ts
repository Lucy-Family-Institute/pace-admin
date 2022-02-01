import NormedAuthor from './normedAuthor'

export default interface ConfidenceTestItem {
  confidenceTypeId: number,
  confidenceTypeName : string,
  confidenceTypeBaseValue: number,
  matchedAuthors: Map<string,NormedAuthor[]>,
  confidenceValue?: number,
  confidenceComment?: string
}