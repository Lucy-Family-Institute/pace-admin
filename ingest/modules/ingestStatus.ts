import { PersonPublicationStatusValue, PublicationStatus, PublicationStatusValue, ConfidenceSetStatusValue } from './publicationStatus'
import _ from 'lodash'
import path from 'path'
import moment from 'moment'
import IngesterConfig from './ingesterConfig'
import { command as writeCsv } from '../units/writeCsv'
import FsHelper from '../units/fsHelper'

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
  combinedFailed: Array<PublicationStatus>
  errorMessages: Array<string>
  warningMessages: Array<string>
  totalRecords: number
  totalFailedRecords: number
  totalAddedPublications: number
  totalSkippedAddPublications: number
  totalFailedAddPublications: number
  totalAddedPersonPublications: number
  totalSkippedAddPersonPublications: number
  totalFailedAddPersonPublications: number
  totalAddedConfidenceSets: number
  totalSkippedAddConfidenceSets: number
  totalFailedAddConfidenceSets: number

  csvBaseLogDir: string
  csvFileBaseName: string
  ingesterConfig: IngesterConfig
  csvFileIndex: number
  csvCombinedFailedFileIndex: number

  loggingBatchSize: number
  keepSeparateFailedLog: boolean

  constructor (csvFileBaseName: string, ingesterConfig: IngesterConfig, keepSeparateFailedLog = true){
    this.combinedFailed = []
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
    this.totalRecords = 0
    this.totalFailedRecords = 0
    this.totalAddedPublications = 0
    this.totalSkippedAddPublications = 0
    this.totalFailedAddPublications = 0
    this.totalAddedPersonPublications = 0
    this.totalSkippedAddPersonPublications = 0
    this.totalFailedAddPersonPublications = 0
    this.totalAddedConfidenceSets = 0
    this.totalSkippedAddConfidenceSets = 0
    this.totalFailedAddConfidenceSets = 0
    this.csvBaseLogDir = `${csvFileBaseName}_logs`
    this.csvFileBaseName = csvFileBaseName
    this.ingesterConfig = ingesterConfig
    this.keepSeparateFailedLog = keepSeparateFailedLog

    if (this.ingesterConfig && this.ingesterConfig.loadPageSize && this.ingesterConfig.loggingBatchSize && this.ingesterConfig.loggingBatchSize > this.ingesterConfig.loadPageSize) {
      console.log(`Warning ingest logging batch size: ${this.ingesterConfig.loggingBatchSize} is greater than load page size ${this.ingesterConfig.loadPageSize}. Will use load page size for logging batch size instead.`)
      this.loggingBatchSize = this.ingesterConfig.loadPageSize
    } else {
      this.loggingBatchSize = this.ingesterConfig.loggingBatchSize
    }
    this.csvFileIndex = 1
    this.csvCombinedFailedFileIndex = 1
  }

  // returns the ingestStatus object updated with the new status added
  async log(pubStatus: PublicationStatus) {
    if (pubStatus) {
      let failedRecord: boolean = false
      this.totalRecords += 1
      if (pubStatus.publicationStatusValue === PublicationStatusValue.ADDED_PUBLICATION) {
        this.addedPublications.push(pubStatus)
        this.totalAddedPublications += 1
      } else if (pubStatus.publicationStatusValue === PublicationStatusValue.SKIPPED_ADD_PUBLICATION) {
        this.skippedAddPublications.push(pubStatus)
        this.totalSkippedAddPublications += 1
        if (pubStatus.errorMessage) {
          this.warningMessages.push(pubStatus.errorMessage)
        }
      } else {
        if (this.keepSeparateFailedLog) {
          failedRecord = true
          this.combinedFailed.push(pubStatus)
          this.totalFailedRecords += 1
        }
        this.failedAddPublications.push(pubStatus)
        this.totalFailedAddPublications += 1
        if (pubStatus.errorMessage) {
          this.errorMessages.push(pubStatus.errorMessage)
        } else {
          this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
        }
      }

      if (pubStatus.personPublicationStatusValue !== undefined) {
        if (pubStatus.personPublicationStatusValue === PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS) {
          this.addedPersonPublications.push(pubStatus)
          this.totalAddedPersonPublications += 1
        } else if (pubStatus.personPublicationStatusValue === PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS) {
          this.skippedAddPersonPublications.push(pubStatus)
          this.totalSkippedAddPersonPublications += 1
          if (pubStatus.errorMessage) {
            this.warningMessages.push(pubStatus.errorMessage)
          }
        } else {
          if (this.keepSeparateFailedLog && !failedRecord) {
            failedRecord = true
            this.totalFailedRecords += 1
            this.combinedFailed.push(pubStatus)
          }
          this.failedAddPersonPublications.push(pubStatus)
          this.totalFailedAddPersonPublications += 1
          if (pubStatus.errorMessage) {
            this.errorMessages.push(pubStatus.errorMessage)
          } else {
            this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
          }
        }
      }

      if (pubStatus.confidenceSetStatusValue !== undefined) {
        if (pubStatus.confidenceSetStatusValue === ConfidenceSetStatusValue.ADDED_CONFIDENCE_SETS) {
          this.addedConfidenceSets.push(pubStatus)
          this.totalAddedConfidenceSets += 1
        } else if (pubStatus.confidenceSetStatusValue === ConfidenceSetStatusValue.SKIPPED_ADD_CONFIDENCE_SETS) {
          this.skippedAddConfidenceSets.push(pubStatus)
          this.totalSkippedAddConfidenceSets += 1
          if (pubStatus.errorMessage) {
            this.warningMessages.push(pubStatus.errorMessage)
          }
        } else {
          if (this.keepSeparateFailedLog && !failedRecord) {
            failedRecord = true
            this.totalFailedRecords += 1
            this.combinedFailed.push(pubStatus)
          }
          this.failedAddConfidenceSets.push(pubStatus)
          this.totalFailedAddConfidenceSets += 1
          if (pubStatus.errorMessage) {
            this.errorMessages.push(pubStatus.errorMessage)
          } else {
            this.errorMessages.push(`Ingest publication from source: '${pubStatus.sourceName}' with sourceid: '${pubStatus.sourceId}' failed with unknown error`)
          }
        }
      }
      await this.logToCSV()
    }
  }

  async logToCSV(){
    if (this.loggingBatchSize && 
      ((this.totalRecords % this.loggingBatchSize) >= 0) &&
      (((this.totalRecords + 1) / this.loggingBatchSize) > this.csvFileIndex)) {
      // if one more pushes it over the batch size, write the current amount
      await this.writeIngestStatusToCSV()
    }
    if ((this.keepSeparateFailedLog && this.loggingBatchSize) &&
      ((this.totalFailedRecords % this.loggingBatchSize) >= 0) &&
      (((this.totalFailedRecords + 1) / this.loggingBatchSize) > this.csvCombinedFailedFileIndex)) {
      await this.writeFailedIngestStatusToCSV()
    }
  }

  async writeLogsToCSV(){
    // skip checks and write out all logs
    await this.writeIngestStatusToCSV()
    if (this.keepSeparateFailedLog) {
      await this.writeFailedIngestStatusToCSV()
    }
  }

  private async writeFailedIngestStatusToCSV() {
    const csvFailedFileName = `${this.csvFileBaseName}_failed_${moment().format('YYYYMMDDHHmmss')}_${this.csvCombinedFailedFileIndex}.csv`
    this.csvCombinedFailedFileIndex += 1

    console.log(`Write failed status of doi's to csv file: ${csvFailedFileName}...`)
    // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
    //write data out to csv
    // create log dir if it does not exist
    const csvFileDir = path.join(process.cwd(), this.ingesterConfig.outputIngestDir, this.csvBaseLogDir)
    FsHelper.createDirIfNotExists(csvFileDir, true)
    const csvFilePath = path.join(csvFileDir, csvFailedFileName)
    
    await writeCsv({
      path: csvFilePath,
      data: this.combinedFailed,
    })

    // if written successfully clear it out
    this.combinedFailed = []
  }

  private async writeIngestStatusToCSV() {
    // console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
    // write combined failure results limited to 1 per doi
    let combinedStatus = []
    const csvFileName = `${this.csvFileBaseName}_${moment().format('YYYYMMDDHHmmss')}_${this.csvFileIndex}.csv`
    this.csvFileIndex += 1
    combinedStatus = _.concat(combinedStatus, this.failedAddPublications)
    if (this.ingesterConfig.outputWarnings) {
      combinedStatus = _.concat(combinedStatus, this.skippedAddPublications)
    }  
    if (this.ingesterConfig.outputPassed) {
      combinedStatus = _.concat(combinedStatus, this.addedPublications)
    }     


    console.log(`Write status of doi's to csv file: ${csvFileName}, output warnings: ${this.ingesterConfig.outputWarnings}, output passed: ${this.ingesterConfig.outputPassed}`)
    // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
    //write data out to csv
    // create log dir if it does not exist
    const csvFileDir = path.join(process.cwd(), this.ingesterConfig.outputIngestDir, this.csvBaseLogDir)
    FsHelper.createDirIfNotExists(csvFileDir, true)
    const csvFilePath = path.join(csvFileDir, csvFileName)
    
    await writeCsv({
      path: csvFilePath,
      data: combinedStatus,
    })

    console.log(`DOIs errors for path ${csvFilePath}':\n${JSON.stringify(this.errorMessages, null, 2)}`)
    console.log(`DOIs warnings for path ${csvFilePath}':\n${JSON.stringify(this.warningMessages, null, 2)}`)
    console.log(`DOIs failed add publications for path ${csvFilePath}': ${this.failedAddPublications.length}`)
    console.log(`DOIs added publications for path ${csvFilePath}': ${this.addedPublications.length}`)
    console.log(`DOIs skipped add publications for path ${csvFilePath}': ${this.skippedAddPublications.length}`)
    console.log(`DOIs failed add person publications for path ${csvFilePath}': ${this.failedAddPersonPublications.length}`)
    console.log(`DOIs added person publications for path ${csvFilePath}': ${this.addedPersonPublications.length}`)
    console.log(`DOIs skipped add person publications for path ${csvFilePath}': ${this.skippedAddPersonPublications.length}`)
    console.log(`DOIs failed add confidence sets for path ${csvFilePath}': ${this.failedAddConfidenceSets.length}`)
    console.log(`DOIs added confidence sets for path ${csvFilePath}': ${this.addedConfidenceSets.length}`)
    console.log(`DOIs skipped add confidence sets for path ${csvFilePath}': ${this.skippedAddConfidenceSets.length}`)

    console.log(`Total DOIs failed add publications': ${this.totalFailedAddPublications}`)
    console.log(`Total DOIs added publications': ${this.totalAddedPublications}`)
    console.log(`Total DOIs skipped add publications': ${this.totalSkippedAddPublications}`)
    console.log(`Total DOIs failed add person publications': ${this.totalFailedAddPersonPublications}`)
    console.log(`Total DOIs added person publications': ${this.totalAddedPersonPublications}`)
    console.log(`Total DOIs skipped add person publications': ${this.totalSkippedAddPersonPublications}`)
    console.log(`Total DOIs failed add confidence sets': ${this.totalFailedAddConfidenceSets}`)
    console.log(`Total DOIs added confidence sets': ${this.totalAddedConfidenceSets}`)
    console.log(`Total DOIs skipped add confidence sets': ${this.totalSkippedAddConfidenceSets}`)
    this.resetStatusLists()
  }

  resetStatusLists () {
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

  public static merge(ingestStatus1: IngestStatus, ingestStatus2: IngestStatus): IngestStatus {
    let newIngestStatus = new IngestStatus(ingestStatus1.csvFileBaseName, ingestStatus1.ingesterConfig, ingestStatus1.keepSeparateFailedLog)
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
    newIngestStatus.totalRecords = ingestStatus1.totalRecords + ingestStatus2.totalRecords
    newIngestStatus.combinedFailed = _.concat(ingestStatus1.combinedFailed, ingestStatus2.combinedFailed)
    newIngestStatus.totalFailedRecords = ingestStatus1.totalFailedRecords + ingestStatus2.totalFailedRecords
    // call this to make sure any incremental logging happens after merge
    newIngestStatus.logToCSV()
    return newIngestStatus
  }
}