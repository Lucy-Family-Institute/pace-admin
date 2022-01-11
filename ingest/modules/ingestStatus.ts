import { PersonPublicationStatusValue, PublicationStatus, PublicationStatusValue, ConfidenceSetStatusValue } from './publicationStatus'
import _ from 'lodash'
export default class IngestStatus {
  addedPublications: Array<PublicationStatus>
  skippedAddPublications: Array<PublicationStatus>
  failedAddPublications: Array<PublicationStatus>
  addedPersonPublications: Array<PublicationStatus>
  skippedAddPersonPublications: Array<PublicationStatus>
  failedAddPersonPublications: Array<PublicationStatus>
  addedConfidenceSets: Array<PublicationStatus>
  skippedAddConfidenceSets: Array<PublicationStatus>
  failedAddConfidenceSets: Array<PublicationStatus>
  errorMessages: Array<string>
  warningMessages: Array<string>

  constructor (){
    this.addedPublications = []
    this.skippedAddPublications = []
    this.failedAddPublications = []
    this.addedPersonPublications = []
    this.skippedAddPersonPublications = []
    this.failedAddPersonPublications = []
    this.addedConfidenceSets = []
    this.skippedAddConfidenceSets = []
    this.failedAddConfidenceSets = []
    this.errorMessages = []
    this.warningMessages = []
  }

  // returns the ingestStatus object updated with the new status added
  log(pubStatus: PublicationStatus) {
    if (pubStatus) {
      if (pubStatus.publicationStatusValue === PublicationStatusValue.ADDED_PUBLICATION) {
        this.addedPublications.push(pubStatus)
      } else if (pubStatus.publicationStatusValue === PublicationStatusValue.SKIPPED_ADD_PUBLICATION) {
        this.skippedAddPublications.push(pubStatus)
        if (pubStatus.errorMessage) {
          this.warningMessages.push(pubStatus.errorMessage)
        }
      } else {
        this.failedAddPublications.push(pubStatus)
        if (pubStatus.errorMessage) {
          this.errorMessages.push(pubStatus.errorMessage)
        } else {
          this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
        }
      }

      if (pubStatus.personPublicationStatusValue) {
        if (pubStatus.personPublicationStatusValue === PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS) {
          this.addedPersonPublications.push(pubStatus)
        } else if (pubStatus.personPublicationStatusValue === PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS) {
          this.skippedAddPersonPublications.push(pubStatus)
          if (pubStatus.errorMessage) {
            this.warningMessages.push(pubStatus.errorMessage)
          }
        } else {
          this.failedAddPersonPublications.push(pubStatus)
          if (pubStatus.errorMessage) {
            this.errorMessages.push(pubStatus.errorMessage)
          } else {
            this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
          }
        }
      }

      if (pubStatus.confidenceSetStatusValue) {
        if (pubStatus.confidenceSetStatusValue === ConfidenceSetStatusValue.ADDED_CONFIDENCE_SETS) {
          this.addedConfidenceSets.push(pubStatus)
        } else if (pubStatus.confidenceSetStatusValue === ConfidenceSetStatusValue.SKIPPED_ADD_CONFIDENCE_SETS) {
          this.skippedAddConfidenceSets.push(pubStatus)
          if (pubStatus.errorMessage) {
            this.warningMessages.push(pubStatus.errorMessage)
          }
        } else {
          this.failedAddConfidenceSets.push(pubStatus)
          if (pubStatus.errorMessage) {
            this.errorMessages.push(pubStatus.errorMessage)
          } else {
            this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
          }
        }
      }
    }
  }

  public static merge(ingestStatus1: IngestStatus, ingestStatus2: IngestStatus): IngestStatus {
    let newIngestStatus = new IngestStatus()
    newIngestStatus.addedPublications = _.concat(ingestStatus1.addedPublications, ingestStatus2.addedPublications)
    newIngestStatus.failedAddPublications = _.concat(ingestStatus1.failedAddPublications, ingestStatus2.failedAddPublications)
    newIngestStatus.skippedAddPublications = _.concat(ingestStatus1.skippedAddPublications, ingestStatus2.skippedAddPublications)
    newIngestStatus.addedPersonPublications = _.concat(ingestStatus1.addedPersonPublications, ingestStatus2.addedPersonPublications)
    newIngestStatus.failedAddPersonPublications = _.concat(ingestStatus1.failedAddPersonPublications, ingestStatus2.failedAddPersonPublications)
    newIngestStatus.skippedAddPersonPublications = _.concat(ingestStatus1.skippedAddPersonPublications, ingestStatus2.skippedAddPersonPublications)
    newIngestStatus.addedConfidenceSets = _.concat(ingestStatus1.addedConfidenceSets, ingestStatus2.addedConfidenceSets)
    newIngestStatus.failedAddConfidenceSets = _.concat(ingestStatus1.failedAddConfidenceSets, ingestStatus2.failedAddConfidenceSets)
    newIngestStatus.skippedAddConfidenceSets = _.concat(ingestStatus1.skippedAddConfidenceSets, ingestStatus2.skippedAddConfidenceSets)
    newIngestStatus.warningMessages = _.concat(ingestStatus1.warningMessages, ingestStatus2.warningMessages)
    newIngestStatus.errorMessages = _.concat(ingestStatus1.errorMessages, ingestStatus2.errorMessages)
    return newIngestStatus
  }
}