import { PublicationStatus, PublicationStatusValue } from './publicationStatus'
import _ from 'lodash'
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
      if (pubStatus.statusValue === PublicationStatusValue.ADDED) {
        this.added.push(pubStatus)
      } else if (pubStatus.statusValue === PublicationStatusValue.SKIPPED) {
        this.skipped.push(pubStatus)
      } else if (pubStatus.statusValue === PublicationStatusValue.FAILED) {
        this.failed.push(pubStatus)
        if (pubStatus.errorMessage) {
          this.errorMessages.push(pubStatus.errorMessage)
        } else {
          this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
        }
      }
    }
  }

  public static merge(ingestStatus1: IngestStatus, ingestStatus2: IngestStatus): IngestStatus {
    let newIngestStatus = new IngestStatus()
    newIngestStatus.added = _.concat(ingestStatus1.added, ingestStatus2.added)
    newIngestStatus.failed = _.concat(ingestStatus1.failed, ingestStatus2.failed)
    newIngestStatus.skipped = _.concat(ingestStatus1.skipped, ingestStatus2.skipped)
    newIngestStatus.errorMessages = _.concat(ingestStatus1.errorMessages, ingestStatus2.errorMessages)
    return newIngestStatus
  }
}