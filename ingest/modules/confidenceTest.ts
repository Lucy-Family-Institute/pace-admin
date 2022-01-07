import ConfidenceTestSet from './confidenceTestSet'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'

export default interface ConfidenceTest {
  person: NormedPerson,
  confidenceTestSets: ConfidenceTestSet[],
  confirmedAuthors: NormedAuthor[],
  confidenceTotal: number,
  doi?: string,
  prevConfidenceTotal?: number
  personsPublicationId?: number
}