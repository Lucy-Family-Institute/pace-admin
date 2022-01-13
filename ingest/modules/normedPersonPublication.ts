import _ from 'lodash'
import ConfidenceSet from './confidenceSet'

export default class NormedPersonPublication {
  // ------ begin declare properties used when using NormedPerson like an interface
  id: Number
  person
  publication
  confidence?: Number
  reviewTypeStatus?: string
  mostRecentReview?
  confidenceSet?: ConfidenceSet
  // ------ end declare properties used when using NormedPerson like an interface

  public static getPublicationConfidence (normedPersonPub: NormedPersonPublication): Number {
    if (normedPersonPub.confidenceSet) {
      return normedPersonPub.confidenceSet.confidenceTotal
    } else {
      return normedPersonPub.confidence
    }
  }
}