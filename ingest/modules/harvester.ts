import _ from 'lodash'
import pMap from 'p-map'
import pTimes from 'p-times'
import { command as writeCsv } from '../units/writeCsv'
import { wait, randomWait } from '../units/randomWait'
import moment from 'moment'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import { HarvestOperationType, HarvestOperation } from './harvestOperation'
import FsHelper from '../units/fsHelper'
import ApolloClient from 'apollo-client'
import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory'

export default class Harvester {
  ds: DataSource
  client: ApolloClient<NormalizedCacheObject>

  constructor (ds: DataSource, client: ApolloClient<NormalizedCacheObject>) {
    this.ds = ds
    this.client = client
  }

  // TODO: Multiple harvest methods for different datasource queries?
  // TODO #2: Separate each person harvest into separate process/worker?
  //
  // threadCount and waitInterval are optional parameters
  // It assumes that threadCount will be defined if you are also defining waitInterval
  //
  // threadCount default = 1 concurrent thread
  // waitInterval desc: wait time between harvests of each person search default = 1000 milliseconds in miliseconds
  async harvest (searchPersons: NormedPerson[], harvestOperation: HarvestOperation, threadCount: number = 1, waitInterval: number = 1000): Promise<HarvestSet[]> {
    let personCounter = 0
    let harvestSets: HarvestSet[] = []
    await pMap(searchPersons, async (person) => {
      let harvestSet: HarvestSet
      try {
        personCounter += 1
        console.log(`Getting publications for ${person.familyName}, ${person.givenName}`)
        // await randomWait(0, waitInterval)
        
        // check that person start date and end date has some overlap with search date range
        // RPJ Commented out to have this logic happen before this method: if (dateRangesOverlapping(person.startDate, person.endDate, searchStartDate, searchEndDate)) {
        // harvest for each name variance
        const nameVariances = (person.nameVariances ? person.nameVariances : [])
        let normedNameVariances = [{ givenName: person.givenName, familyName: person.familyName}]
        if (harvestOperation.harvestOperationType === HarvestOperationType.QUERY_BY_AUTHOR_NAME){
          normedNameVariances = _.concat(normedNameVariances, _.map(nameVariances, (variance) => {
            return {
              givenName: variance.given_name,
              familyName: variance.family_name
            }
          }))
        }          
        await pMap (normedNameVariances, async (name) => {
          const currentHarvestSets: HarvestSet[] = []
          let searchPerson = _.cloneDeep(person)
          try {
            searchPerson = _.set(searchPerson, 'familyName', name.familyName)
            searchPerson = _.set(searchPerson, 'givenName', name.givenName)
            searchPerson = _.set(searchPerson, 'givenNameInitial', name.givenName[0])
          } catch (error) {
            console.log(`Error on name variance: ${JSON.stringify(name, null, 2)}`)
            throw error
          }
          let offset = 0
          // have to alias this because nested this call below makes this undefined
          let thisHarvester = this

          let sessionState = {}
          await wait(thisHarvester.ds.getDataSourceConfig().requestInterval)
          harvestSet = await this.fetchPublications(searchPerson, harvestOperation, sessionState, offset)
          if (harvestSet) {
            currentHarvestSets.push(harvestSet)
          }
          const pageSize = this.ds.getRequestPageSize().valueOf()
          const totalResults = harvestSet.totalResults.valueOf()

          sessionState = harvestSet.sessionState

          if (totalResults > pageSize){
            let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
            //if no remainder subtract one since already did one call
            if ((totalResults % pageSize) <= 0) {
              numberOfRequests -= 1
            }

            // make variable since 'this' reference scope gets confused inside loops below
            const currentDS = this.ds

            //loop to get the result of the results
            console.log(`Making ${numberOfRequests} requests for name variation ${searchPerson.familyName}, ${searchPerson.givenNameInitial}`)
            await pTimes (numberOfRequests, async function (index) {
              await wait(currentDS.getDataSourceConfig().requestInterval)
              if (offset + pageSize < totalResults){
                offset += pageSize
              } else {
                offset += totalResults - offset
              }
              harvestSet = await thisHarvester.fetchPublications(searchPerson, harvestOperation, sessionState, offset)
              if (harvestSet) {
                currentHarvestSets.push(harvestSet)
              }
            }, { concurrency: 1})
          }
          // check total retrieved result matches what was returned
          let totalRetrieved = 0
          _.each (currentHarvestSets, (harvestSet) => {
            totalRetrieved += harvestSet.sourcePublications.length
          })
          if (totalRetrieved < totalResults) {
            throw `All expected results not returned for ${searchPerson.familyName}, ${searchPerson.givenName}, expected: ${totalResults} actual: ${totalRetrieved}, harvestOperationType: ${HarvestOperationType[harvestOperation.harvestOperationType]} start date: ${harvestOperation.startDate} and end date ${harvestOperation.endDate}`
          } else {
            console.log(`Retrieved (${totalRetrieved} of ${totalResults}) expected results for ${searchPerson.familyName}, ${searchPerson.givenName}, harvestOperationType: ${HarvestOperationType[harvestOperation.harvestOperationType]} start date: ${harvestOperation.startDate} and end date ${harvestOperation.endDate}`)
          }
          harvestSets = _.concat(harvestSets, currentHarvestSets)
        }, { concurrency: 1 })
      } catch (error) {
        console.log(error)
        const errorMessage = `Error on get papers for author: ${person.familyName}, ${person.givenName}, , harvestOperationType: ${HarvestOperationType[harvestOperation.harvestOperationType]} start date: ${harvestOperation.startDate} and end date ${harvestOperation.endDate}, error: ${error}`
        if (!harvestSet) {
          harvestSet = {
            sourceName: this.ds.getSourceName(),
            sourcePublications: [],
            totalResults: 0
          }
        }
        if (!harvestSet.errors) {
          harvestSet.errors = []
        }
        harvestSet.errors.push(errorMessage)
        harvestSets.push(harvestSet)
      }
    }, {concurrency: threadCount})

    return harvestSets
  }

  private createErrorHarvestSet(harvestOperationTypeName: string): HarvestSet {
    const error = `'${harvestOperationTypeName}' not supported by datasource harvester ${this.ds.getSourceName()}`
    return {
      sourceName: this.ds.getSourceName(),
      sourcePublications: [],
      totalResults: 0,
      errors: [error]
    }
  }

  /**
   *  @param person a NormedPerson object to harvest for using name values
   * 
   *  @param harvestOperation a HarvestOperation defining the method, start, end dates to retrieve results
   * 
   *  @param sessionState a hash of session state values as needed by the datasource to maintain state across multiple requests
   * 
   *  @param offset the offset of the request assuming there may be more than one to retrieve all results
   * 
   *  @param searchStartDate the Date object defining the lower bound date for our search
   * 
   *  @returns HarvestSet object for current request with both normalized and source publications included
   */
  async fetchPublications(person: NormedPerson, harvestOperation: HarvestOperation, sessionState:{}, offset: number): Promise<HarvestSet> {
    let harvestSet: HarvestSet
    // add check to make sure all papers listed in results are actually returned
    const harvestOperationStrName = HarvestOperationType[harvestOperation.harvestOperationType]
    switch(harvestOperation.harvestOperationType) {
      case HarvestOperationType.QUERY_BY_AUTHOR_NAME: {
        if (typeof this.ds['getPublicationsByAuthorName'] === 'function'){
          harvestSet = await this.ds.getPublicationsByAuthorName(person, sessionState, offset, harvestOperation.startDate, harvestOperation.endDate)
        } else {
          harvestSet = this.createErrorHarvestSet(harvestOperationStrName)
        }
        break
      } case HarvestOperationType.QUERY_BY_AUTHOR_ID: {
        if (typeof this.ds['getPublicationsByAuthorId'] === 'function'){
          harvestSet = await this.ds.getPublicationsByAuthorId(person, sessionState, offset, harvestOperation.startDate, harvestOperation.endDate)
        } else {
          harvestSet = this.createErrorHarvestSet(harvestOperationStrName)
        }
        break
      }
    }
    console.log(`Querying ${this.ds.getSourceName()} with harvestOperationType: ${harvestOperationStrName} date: ${harvestOperation.startDate}, offset: ${offset}, found pubs: ${harvestSet.sourcePublications.length} person: ${person.familyName}, ${person.givenName}`)
    // console.log(`Source pubs are: ${harvestSet.sourcePublications.length}`)
    // this assumes that getNormedPublications will set the sourceMetadata value to the sourcePublication value
    const normedPublications: NormedPublication[] = await this.ds.getNormedPublications(harvestSet.sourcePublications, person)
    _.set(harvestSet, 'normedPublications',normedPublications)
    // console.log(`Normed pubs are: ${harvestSet.normedPublications.length}`)

    return harvestSet
  }

  /**
   * Runs a harvest against the search persons provided and writes results to a source file of path: 
   *    sourcename.startdateyear.currenttimestamp.csv
   * @param harvestOperation The harvest operation used defined by the HarvestOperation passed in
   * @param searchPersons an Array of NormedPerson objects to harvest against
   * @param filePrefix optional parameter if set to use as a prefix for results files
   * 
   * @returns the filepath of the output csv file
   */
  async harvestToCsv(harvestOperation: HarvestOperation, searchPersons: NormedPerson[], filePrefix?: string): Promise<string> {
    const harvestSets: HarvestSet[] = await this.harvest(searchPersons, harvestOperation, 1, this.ds.getDataSourceConfig().requestInterval.valueOf())
  
    const rawHarvestResultsDir = NormedPublication.getRawHarvestDirPath(harvestOperation.harvestResultsDir)
    FsHelper.createDirIfNotExists(rawHarvestResultsDir, true)

    let filePath = `${rawHarvestResultsDir}/`
    if (filePrefix) {
      filePath = `${filePath}${filePrefix}_`
    }
    filePath = `${filePath}${this.ds.getSourceName()}.${harvestOperation.startDate.getFullYear()}.${moment().format('YYYYMMDDHHmmss')}.csv`
    let normedPubs = []
    let counter = 0
    _.each(harvestSets, (harvestSet) => {
      counter += 1
      // console.log(`Harvest set returned ${counter}: ${JSON.stringify((harvestSet.normedPublications ? harvestSet.normedPublications.length : 0), null, 2)}`)
      if (harvestSet.normedPublications) {
        normedPubs = _.concat(normedPubs, harvestSet.normedPublications)
      }
    })
    try {
      // console.log(`Harvestsets are: ${JSON.stringify(harvestSets[0].normedPublications[0], null, 2)}`)
      // console.log(`Writing normed pubs to csv: ${JSON.stringify(normedPubs, null, 2)}`)
      await NormedPublication.writeToCSV(normedPubs, filePath, false, this.ds.getDataSourceConfig().batchSize)
      await pMap (normedPubs, async (normedPub) => {
        await NormedPublication.writeSourceMetadataToJSON(normedPub, normedPub.sourceMetadata, harvestOperation.harvestResultsDir)
      })
    } catch (error) {
      console.log(`Error on write harvested normed pubs to csv: ${error}`)
      throw error
    }
    // console.log(`No error on normed pubs: ${JSON.stringify(normedPubs)}`)
    return filePath
  }

  public static async loadPublicationsFromManifestFile(manifestFilePath, dataDirPath): Promise<NormedPublication[]> {
    let normedPubs: NormedPublication[]
    try {
      console.log(`Loading publications from ${manifestFilePath}`)

      // get normed publications from filedir and manifest
      normedPubs = await NormedPublication.loadFromCSV(manifestFilePath, dataDirPath)
      // console.log(`Ingest status is: ${JSON.stringify(ingestStatus)}`)
    } catch (error) {
      console.log(`Error encountered on load publications with paths manifest: '${manifestFilePath}' data dir path: '${dataDirPath}'`)
      throw (error)
    }
    return normedPubs
  }

  public static async dedupPublicationsFromDir(sourceDir: string): Promise<NormedPublication[]> {
    let normedPubs: NormedPublication[] = []
    let origPubCount = 0
    try {
      const loadPaths = FsHelper.loadDirPaths(sourceDir, true)
      await pMap(loadPaths, async (filePath, fileIndex) => {
        // skip any subdirectories
        console.log(`Loading publications file (${(fileIndex + 1)} of ${loadPaths.length}) with path: ${filePath}`)
        const fileName = FsHelper.getFileName(filePath)
        const dataDir = FsHelper.getParentDir(filePath)
        const curNormedPubs = await Harvester.loadPublicationsFromManifestFile(filePath, dataDir)
        origPubCount = origPubCount + curNormedPubs.length
        normedPubs = NormedPublication.mergeNormedPublicationLists(normedPubs, curNormedPubs)
        console.log(`Normed pubs list length currently: ${normedPubs.length}`)
      }, { concurrency: 1 })
    } catch (error) {
      //attempt to write status to file
      console.log(`Error on load publications path '${sourceDir}' files: ${error}, attempt to output logged status`)
    }
    console.log(`Dedupped publications from original count: ${origPubCount} to ${normedPubs.length}`)
    return normedPubs    
  }

  public static async dedupHarvestedPublications(sourceHarvestDir, targetDedupedDirBasePath, dataDir, filePubBatchSize, dirBatchSize) {
    console.log(`Deduping publications for source dir: ${sourceHarvestDir}`)
    const dedupedNormedPubs: NormedPublication[] = await Harvester.dedupPublicationsFromDir(sourceHarvestDir)
    try {
      // now chunk the dedupedPubs by dirBatchSize * filePubBatchSize => total number of pubs in each results dir
      // to break them into managable chunks to load balance the amount of pubs pushed through the ingest process at once
      const dedupBatchSize = dirBatchSize * filePubBatchSize
      const dedupBatches = _.chunk(dedupedNormedPubs, dedupBatchSize)
      await pMap(dedupBatches, async (dedupedPubs, index) => {

        const targetDedupBaseParent = FsHelper.getParentDir(targetDedupedDirBasePath)
        const targetDedupBaseName = FsHelper.getBaseDirName(targetDedupedDirBasePath)
        const targetDedupedDir = `${targetDedupBaseParent}/${targetDedupBaseName}_${index}`
        // now output each dedupedBatch to an output results dir, use the 
        console.log(`Writing deduped batch (${index+1} of ${dedupBatches.length}) pubs back to csv target deduped dir: ${targetDedupedDir} with batch size: ${filePubBatchSize}`)
        const filePath = `${targetDedupedDir}/${targetDedupBaseName}.deduped.${moment().format('YYYYMMDDHHmmss')}.csv`

        console.log(`Target deduped dir is: ${targetDedupedDir}`)
        FsHelper.createDirIfNotExists(targetDedupedDir, true)

        await NormedPublication.writeToCSV(dedupedPubs, filePath, false, filePubBatchSize)
        console.log(`Writing source metadata for deduped batch (${index+1} of ${dedupBatches.length}) pubs to target dir: ${targetDedupedDir}...`)
        await pMap (dedupedPubs, async (normedPub) => {
          const sourceMetadata = NormedPublication.getSourceMetadata(normedPub, dataDir)
          await NormedPublication.writeSourceMetadataToJSON(normedPub, sourceMetadata, targetDedupedDir)
        })
        console.log(`Finished writing batch (${index+1} of ${dedupBatches.length}) pubs back to csv target deduped dir: ${targetDedupedDir} with batch size: ${filePubBatchSize}`)
      }, { concurrency: 1})
    } catch (error) {
      console.log(`Error on dedup normed pubs: ${error}`)
      throw error
    }
  }

  async executeHarvest() {
    let succeededPapers = []
    let failedPapers = []
    let succeededAuthors = []
    let failedAuthors = []

    // returns map of year to array of NormedPersons
    const harvestOperations: HarvestOperation[] = await this.ds.getHarvestOperations(this.client)
    // perform all harvest operations for this author, could be more than one like search by author id plus simple name search
    await pMap(harvestOperations, async (harvestOperation: HarvestOperation) => {
      const harvestOperationTypeStrName = HarvestOperationType[harvestOperation.harvestOperationType]  
      let personCounter = 0
  
      // const subset = _.slice(harvestOperation.normedPersons, 0, 2)
      // await pMap(subset, async (person) => {
      await pMap(harvestOperation.normedPersons, async (person) => {
        try {
          personCounter += 1
          console.log(`Getting papers for ${person.familyName}, ${person.givenName} persons via ${harvestOperationTypeStrName}`)
          // run for each name plus name variance, put name variance second in case undefined
          await wait(this.ds.getDataSourceConfig().requestInterval)
          await this.harvestToCsv(harvestOperation, [person], `${person.familyName}_${person.givenName}`)
          await wait(1500)

          succeededAuthors.push(person)
        } catch (error) {
          const errorMessage = `Error on get CrossRef papers for author: ${JSON.stringify(person, null, 2)}: ${error}`
          failedPapers.push(errorMessage)
          failedAuthors.push(person)
          console.log(errorMessage)
        }
      }, {concurrency: 1})

      const rawHarvestDir = NormedPublication.getRawHarvestDirPath(harvestOperation.harvestResultsDir)
  
      console.log(`Deduping publications to path: ${harvestOperation.harvestResultsDir}`)
      // make this call be something standardized for every harvester
      const baseDirName = FsHelper.getBaseDirName(harvestOperation.harvestResultsDir)
      const dedupTargetBasePath = `${harvestOperation.harvestResultsDir}/${baseDirName}_deduped/${baseDirName}/`
      const dataDir = harvestOperation.harvestResultsDir
      await Harvester.dedupHarvestedPublications(rawHarvestDir,dedupTargetBasePath,dataDir, this.ds.getDataSourceConfig().batchSize, this.ds.getDataSourceConfig().harvestFileBatchSize)

      console.log(`Failed authors: ${failedAuthors.length}`)
      console.log(`Succeeded authors: ${succeededAuthors.length}`)
      console.log(`Failed papers: ${failedPapers.length}`)
      // change fetch script to be just datasource config input, move most of above code routine to harvester class so pubs harvested are in standard raw search result format, and deduped record manifests in root dir alongside source_metadata
    }, { concurrency: 1 })
  }
}