import _ from 'lodash'
import pMap from 'p-map'
import pTimes from 'p-times'
import { command as writeCsv } from '../units/writeCsv'
import { dateRangesOverlapping } from '../units/dateRange'
import { wait, randomWait } from '../units/randomWait'
import moment from 'moment'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './harvestSet'

export enum HarvestOperation {
  QUERY_BY_AUTHOR_NAME,
  QUERY_BY_AUTHOR_ID
}

export class Harvester {
  ds: DataSource

  constructor (ds: DataSource) {
    this.ds = ds
  }

  // TODO: Multiple harvest methods for different datasource queries?
  // TODO #2: Separate each person harvest into separate process/worker?
  //
  // threadCount and waitInterval are optional parameters
  // It assumes that threadCount will be defined if you are also defining waitInterval
  //
  // threadCount default = 1 concurrent thread
  // waitInterval desc: wait time between harvests of each person search default = 1000 milliseconds in miliseconds
  async harvest (searchPersons: NormedPerson[], harvestBy: HarvestOperation, searchStartDate: Date, searchEndDate: Date = undefined, threadCount: number = 1, waitInterval: number = 1000): Promise<HarvestSet[]> {
    let personCounter = 0
    let harvestSets: HarvestSet[] = []
    await pMap(searchPersons, async (person) => {
      let harvestSet: HarvestSet
      try {
        personCounter += 1
        console.log(`Getting publications for ${person.familyName}, ${person.givenName}`)
        // await randomWait(0, waitInterval)
        
        // check that person start date and end date has some overlap with search date range
        if (dateRangesOverlapping(person.startDate, person.endDate, searchStartDate, searchEndDate)) {
          // harvest for each name variance
          const nameVariances = (person.nameVariances ? person.nameVariances : [])
          const normedNameVariances = _.map(nameVariances, (variance) => {
            return {
              givenName: variance.given_name,
              familyName: variance.family_name
            }
          })

          normedNameVariances.push({ givenName: person.givenName, familyName: person.familyName})
          
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
            harvestSet = await this.fetchPublications(searchPerson, harvestBy, sessionState, offset, searchStartDate, searchEndDate)
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
                harvestSet = await thisHarvester.fetchPublications(searchPerson, harvestBy, sessionState, offset, searchStartDate, searchEndDate)
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
              throw `All expected results not returned for ${searchPerson.familyName}, ${searchPerson.givenName}, expected: ${totalResults} actual: ${totalRetrieved} start date: ${searchPerson.startDate} and end date ${searchPerson.endDate}`
            } else {
              console.log(`Retrieved (${totalRetrieved} of ${totalResults}) expected results for ${searchPerson.familyName}, ${searchPerson.givenName} start date: ${searchPerson.startDate} and end date ${searchPerson.endDate}`)
              // _.each (currentHarvestSets, (harvestSet: HarvestSet) => {
              //   _.each (harvestSet.normedPublications, (pub: NormedPublication) => {
              //     console.log(`doi:${pub.doi} Normed Pub search person: ${JSON.stringify(pub.searchPerson, null, 2)}`)
              //   })
              // })
              // console.log(`Normed pubs`)
            }
            harvestSets = _.concat(harvestSets, currentHarvestSets)
          }, { concurrency: 1 })
        } else {
          console.log(`Warning: Skipping harvest of '${person.familyName}, ${person.givenName}' because person start date: ${person.startDate} and end date ${person.endDate} not within search start date ${searchStartDate} and end date ${searchEndDate}.)`)
        }
      } catch (error) {
        console.log(error)
        const errorMessage = `Error on get papers for author: ${person.familyName}, ${person.givenName}: ${error}`
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

  private createErrorHarvestSet(harvestOperationName: string): HarvestSet {
    const error = `'${harvestOperationName}' not supported by datasource harvester ${this.ds.getSourceName()}`
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
   *  @param harvestBy a HarvestOperation defining the method to retrieve results
   * 
   *  @param sessionState a hash of session state values as needed by the datasource to maintain state across multiple requests
   * 
   *  @param offset the offset of the request assuming there may be more than one to retrieve all results
   * 
   *  @param searchStartDate the Date object defining the lower bound date for our search
   * 
   *  @returns HarvestSet object for current request with both normalized and source publications included
   */
  async fetchPublications(person: NormedPerson, harvestBy: HarvestOperation, sessionState:{}, offset: number, searchStartDate: Date, searchEndDate: Date): Promise<HarvestSet> {
    let harvestSet: HarvestSet
    // add check to make sure all papers listed in results are actually returned
    switch(harvestBy) {
      case HarvestOperation.QUERY_BY_AUTHOR_NAME: {
        if (typeof this.ds['getPublicationsByAuthorName'] === 'function'){
          harvestSet = await this.ds.getPublicationsByAuthorName(person, sessionState, offset, searchStartDate, searchEndDate)
        } else {
          harvestSet = this.createErrorHarvestSet('QUERY_BY_AUTHOR_NAME')
        }
        break
      } case HarvestOperation.QUERY_BY_AUTHOR_ID: {
        if (typeof this.ds['getPublicationsByAuthorId'] === 'function'){
          harvestSet = await this.ds.getPublicationsByAuthorId(person, sessionState, offset, searchStartDate, searchEndDate)
        } else {
          harvestSet = this.createErrorHarvestSet('QUERY_BY_AUTHOR_ID')
        }
        break
      }
    }
    console.log(`Querying ${this.ds.getSourceName()} with date: ${searchStartDate}, offset: ${offset}, found pubs: ${harvestSet.sourcePublications.length} person: ${person.familyName}, ${person.givenName}`)
    const normedPublications: NormedPublication[] = this.ds.getNormedPublications(harvestSet.sourcePublications, person)
    _.set(harvestSet, 'normedPublications',normedPublications)
    return harvestSet
  }


  /**
   * Runs a harvest against the search persons provided and writes results to a source file of path: 
   *    sourcename.startdateyear.currenttimestamp.csv
   * @param searchPersons an Array of NormedPerson objects to harvest against
   * @param harvestBy The harvest operation used defined by the HarvestOperation constant passed in
   * @param searchStartDate The start date range for the harvest
   * @param searchEndDate The end date range of the harvest (if provided)
   * 
   * @returns the filepath of the output csv file
   */
  async harvestToCsv(resultsFileDir: string, searchPersons: NormedPerson[], harvestBy: HarvestOperation, searchStartDate: Date, searchEndDate?: Date, filePrefix?: string): Promise<string> {
    const harvestSets: HarvestSet[] = await this.harvest(searchPersons, harvestBy, searchStartDate, searchEndDate, 1)

    // _.each (harvestSets, (harvestSet: HarvestSet) => {
    //   _.each (harvestSet.normedPublications, (pub: NormedPublication) => {
    //     console.log(`After harvest, doi:${pub.doi} Normed Pub search person: ${JSON.stringify(pub.searchPerson, null, 2)} doi:${pub.doi}`)
    //   })
    // })

    const fs = require('fs');
    
    if (!fs.existsSync(resultsFileDir)){
        fs.mkdirSync(resultsFileDir);
    }

    let filePath = resultsFileDir
    if (filePrefix) {
      filePath = `${filePath}${filePrefix}_`
    }
    filePath = `${filePath}${this.ds.getSourceName()}.${searchStartDate.getFullYear()}.${moment().format('YYYYMMDDHHmmss')}.csv`
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
      await NormedPublication.writeToCSV(normedPubs, filePath)
    } catch (error) {
      console.log(`Error on normed pubs: ${JSON.stringify(normedPubs, null, 2)}`)
      throw error
    }
    // console.log(`No error on normed pubs: ${JSON.stringify(normedPubs)}`)
    return filePath
  }
}