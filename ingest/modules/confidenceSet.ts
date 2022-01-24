import ConfidenceTest from './confidenceTest'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'

export default interface ConfidenceSet {
  person?: NormedPerson,
  confidenceTests?: ConfidenceTest[],
  confirmedAuthors?: NormedAuthor[],
  confidenceTotal: number,
  doi?: string,
  prevConfidenceTotal?: number
  personsPublicationId?: number
}