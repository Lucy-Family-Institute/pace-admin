export default interface IngesterConfig {
  minConfidence: Number,
  confidenceAlgorithmVersion: string,
  checkForNewPersonMatches: boolean,
  overwriteConfidenceSets: boolean,
  outputWarnings: boolean,
  defaultWaitInterval: number
}