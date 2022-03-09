import _ from 'lodash'
import ConfidenceSet from './confidenceSet'

export default class NormedPersonPublication {
  // ------ begin declare properties used when using NormedPerson like an interface
  id: Number
  person_id: number
  person?
  publication?  // will be initialized if populating with full pub object, otherwise rely on properties below
  title: string
  doi: string
  sourceName: string
  sourceId: string
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