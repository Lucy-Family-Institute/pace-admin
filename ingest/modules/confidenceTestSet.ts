import ConfidenceTestItem from './confidenceTestItem'
import NormedPerson from './normedPerson'

export default interface ConfidenceTestSet {
  rank: string
  testPerson: NormedPerson,
  confidenceTestItems: ConfidenceTestItem[]
}