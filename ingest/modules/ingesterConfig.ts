export default interface IngesterConfig {
  minConfidence: Number,
  confidenceAlgorithmVersion: string,
  checkForNewPersonMatches: boolean,
  overwriteConfidenceSets: boolean,
  outputWarnings: boolean,
  outputPassed: boolean,
  defaultWaitInterval: number
}