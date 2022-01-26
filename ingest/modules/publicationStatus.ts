import NormedPublication from "./normedPublication"
import _ from 'lodash'

export enum PublicationStatusValue {
  ADDED_PUBLICATION,
  SKIPPED_ADD_PUBLICATION,
  FAILED_ADD_PUBLICATION,
  FAILED_ADD_PUBLICATION_NO_PERSON_MATCH,
  FAILED_ADD_PUBLICATION_UNKNOWN_PUB_TYPE,
  FAILED_ADD_PUBLICATION_UNKNOWN_TITLE,
  FAILED_ADD_PUBLICATION_NO_CSL
}

export enum PersonPublicationStatusValue {
  ADDED_PERSON_PUBLICATIONS,
  SKIPPED_ADD_PERSON_PUBLICATIONS,
  FAILED_ADD_PERSON_PUBLICATIONS
}

export enum ConfidenceSetStatusValue {
  ADDED_CONFIDENCE_SETS,
  SKIPPED_ADD_CONFIDENCE_SETS,
  FAILED_ADD_CONFIDENCE_SETS
}

export class PublicationStatus implements NormedPublication{
  datasourceName: string
  sourceId: string
  doi: string
  title: string
  journalTitle: string
  publicationDate: string
  bibtex?: string			
  publicationId?: number
  errorMessage?: string
  publicationStatusValue: number
  publicationStatus: string
  personPublicationStatusValue?: number
  personPublicationStatus?: string
  confidenceSetStatusValue?: number
  confidenceSetStatus?: string
  sourceMetadata?: Object
      
  constructor (normedPub: NormedPublication, publicationId: number, errorMessage: string, publicationStatusValue: PublicationStatusValue, personPublicationStatusValue?: PersonPublicationStatusValue, confidenceSetStatusValue?: ConfidenceSetStatusValue) {
    this.datasourceName = normedPub.datasourceName
    this.sourceId = normedPub.sourceId
    this.doi = normedPub.doi
    this.title = normedPub.title
    this.journalTitle = normedPub.journalTitle
    this.publicationDate = normedPub.publicationDate
    // truncate author lists as needed
    const chunkedAuthors = _.chunk(normedPub.authors, 10)
    // skip if either author set is too large to avoid memory logjams while processes are running
    // this.authors = ((chunkedAuthors && chunkedAuthors.length > 0) ? JSON.stringify(chunkedAuthors[0]) : '')
     // truncate confirmed author lists as needed
    const chunkedConfirmedAuthors = _.chunk(normedPub.confirmedAuthors, 10)
    // this.confirmedAuthors = ((chunkedConfirmedAuthors && chunkedConfirmedAuthors.length > 0) ? JSON.stringify(chunkedConfirmedAuthors[0]) : '')
    this.bibtex = normedPub.bibtex
    if (publicationId > 0) {
      this.publicationId = publicationId
    }
    if (errorMessage) {
      this.errorMessage = errorMessage
    }
    this.publicationStatusValue = publicationStatusValue
    this.publicationStatus = PublicationStatusValue[publicationStatusValue]

    if (personPublicationStatusValue !== undefined) {
      this.personPublicationStatusValue = personPublicationStatusValue
      this.personPublicationStatus = PersonPublicationStatusValue[personPublicationStatusValue]
    } else {
      this.personPublicationStatusValue = undefined
      this.personPublicationStatus = undefined
    }

    if (confidenceSetStatusValue !== undefined) {
      this.confidenceSetStatusValue = confidenceSetStatusValue
      this.confidenceSetStatus = ConfidenceSetStatusValue[confidenceSetStatusValue]
    } else {
      this.confidenceSetStatusValue = undefined
      this.confidenceSetStatus = undefined
    }
  }

  getObjectToCSVMap () {
    return NormedPublication.loadNormedPublicationObjectToCSVMap()
  }

  getCSVRow(objectToCSVMap) {
    // translate any normed pub values to csv row map equivalents
    // duck type this to a NormedPublication
    let normedPubCSVRow = NormedPublication.getCSVRow(this, objectToCSVMap)
    return _.merge(normedPubCSVRow, this)
  }
}