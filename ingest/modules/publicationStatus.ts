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
  publicationId?: number
  errorMessage?: string
  private value: number
      
  constructor (normedPub: NormedPublication, value: PublicationStatusValue, publicationId: number, errorMessage?: string) {
    this.sourceName = normedPub.datasourceName
    this.sourceId = normedPub.sourceId
    this.doi = normedPub.doi
    if (publicationId > 0) {
      this.publicationId = publicationId
    }
    if (errorMessage) {
      this.errorMessage = errorMessage
    }
    this.value = value
  }

  statusValue () {
    return this.value
  }
}