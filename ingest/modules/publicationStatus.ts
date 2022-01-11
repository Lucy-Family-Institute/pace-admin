import NormedPublication from "./normedPublication"

export enum PublicationStatusValue {
  ADDED_PUBLICATION,
  SKIPPED_ADD_PUBLICATION,
  FAILED_ADD_PUBLICATION,
  FAILED_ADD_PUBLICATION_NO_PERSON_MATCH,
  FAILED_ADD_PUBLICATION_UNKNOWN_PUB_TYPE
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

export class PublicationStatus {
  sourceName: string
  sourceId: string
  doi: string
  title: string
  journalTitle: string
  publicationDate: string
  authors: string
  confirmedAuthors?: string
  bibTex?: string			
  publicationId?: number
  errorMessage?: string
  publicationStatusValue: number
  publicationStatus: string
  personPublicationStatusValue?: number
  personPublicationStatus?: string
  confidenceSetStatusValue?: number
  confidenceSetStatus?: string
      
  constructor (normedPub: NormedPublication, publicationId: number, errorMessage: string, publicationStatusValue: PublicationStatusValue, personPublicationStatusValue?: PersonPublicationStatusValue, confidenceSetStatusValue?: ConfidenceSetStatusValue) {
    this.sourceName = normedPub.datasourceName
    this.sourceId = normedPub.sourceId
    this.doi = normedPub.doi
    this.title = normedPub.title
    this.journalTitle = normedPub.journalTitle
    this.publicationDate = normedPub.publicationDate
    this.authors = JSON.stringify(normedPub.authors)
    this.confirmedAuthors = JSON.stringify(normedPub.confirmedAuthors)
    this.bibTex = normedPub.bibtex
    if (publicationId > 0) {
      this.publicationId = publicationId
    }
    if (errorMessage) {
      this.errorMessage = errorMessage
    }
    this.publicationStatusValue = publicationStatusValue
    this.publicationStatus = PublicationStatusValue[publicationStatusValue]

    if (personPublicationStatusValue) {
      this.personPublicationStatusValue = personPublicationStatusValue
      this.personPublicationStatus = PersonPublicationStatusValue[personPublicationStatusValue]
    } else {
      this.personPublicationStatusValue = undefined
      this.personPublicationStatus = undefined
    }

    if (confidenceSetStatusValue) {
      this.confidenceSetStatusValue = confidenceSetStatusValue
      this.confidenceSetStatus = ConfidenceSetStatusValue[confidenceSetStatusValue]
    } else {
      this.confidenceSetStatusValue = undefined
      this.confidenceSetStatus = undefined
    }
  }
}