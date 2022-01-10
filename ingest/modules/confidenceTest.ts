import ConfidenceTestItem from './confidenceTestItem'
import NormedPerson from './normedPerson'

export default interface ConfidenceTest {
  rank: string
  testPerson: NormedPerson,
  confidenceTestItems: ConfidenceTestItem[]
}