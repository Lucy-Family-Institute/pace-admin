import { PublicationStatus, PublicationStatusValue } from './publicationStatus'

export default class IngestStatus {
  added: Array<PublicationStatus>
  skipped: Array<PublicationStatus>
  failed: Array<PublicationStatus>
  errorMessages: Array<string>

  constructor (){
    this.added = []
    this.skipped = []
    this.failed = []
    this.errorMessages = []
  }

  // returns the ingestStatus object updated with the new status added
  log(pubStatus: PublicationStatus) {
    if (pubStatus) {
      if (pubStatus.statusValue() === PublicationStatusValue.ADDED) {
        this.added.push(pubStatus)
      } else if (pubStatus.statusValue() === PublicationStatusValue.SKIPPED) {
        this.skipped.push(pubStatus)
      } else if (pubStatus.statusValue() === PublicationStatusValue.FAILED) {
        this.failed.push(pubStatus)
        if (pubStatus.errorMessage) {
          this.errorMessages.push(pubStatus.errorMessage)
        } else {
          this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
        }
      }
    }
  }
}