import NormedPublication from "./normedPublication"

export enum PublicationStatusValue {
  ADDED,
  SKIPPED,
  FAILED
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
  statusValue: number
  status: string
      
  constructor (normedPub: NormedPublication, value: PublicationStatusValue, publicationId: number, errorMessage?: string) {
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
    this.statusValue = value
    this.status = PublicationStatusValue[value]
  }
}