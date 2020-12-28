import _ from 'lodash'
import pMap from 'p-map'
import { command as writeCsv } from '../units/writeCsv'
import { dateRangesOverlapping } from '../units/dateRange'
import { randomWait } from '../units/randomWait'
import moment from 'moment'

class Harvester {
  ds: DataSource

  constructor (ds: DataSource) {
    this.ds = ds
  }

  // TODO: Multiple harvest methods for different datasource queries?
  //
  // threadCount and waitInterval are optional parameters
  // It assumes that threadCount will be defined if you are also defining waitInterval
  //
  // threadCount default = 1 concurrent thread
  // waitInterval desc: wait time between harvests of each person search default = 1000 milliseconds in miliseconds
  async harvest (searchPersons: NormedPerson[], searchStartDate: Date, searchEndDate: Date, threadCount: number = 1, waitInterval: number = 1000) {
    let personCounter = 0
    let succeededPapers = []
    let failedPapers = []
    let succeededAuthors = []
    let failedAuthors = []
    await pMap(searchPersons, async (person) => {
      try {
        personCounter += 1
        console.log(`Getting publications for ${person.lastName}, ${person.firstName}`)
        await randomWait(0, waitInterval)
        // console.log(`Finished wait Getting papers for ${person.lastName}, ${person.firstName}`)
        // check that person start date and end date has some overlap with search date range
        if (dateRangesOverlapping(person.startDate, person.endDate, searchStartDate, searchEndDate)) {
          const sourcePublications = await this.ds.getPublicationsByAuthorName(person, searchStartDate, searchEndDate)
          const normedPublications: NormedPublication[] = this.ds.getNormedPublications(sourcePublications)
          // console.log(`normed papers are: ${JSON.stringify(simplifiedPapers, null, 2)}`)
          //push in whole array for now and flatten later
          succeededPapers.push(normedPublications)
          succeededAuthors.push(person)
        } else {
          console.log(`Warning: Skipping harvest of '${person.lastName}, ${person.firstName}' because person start date: ${person.startDate} and end date ${person.endDate} not within search start date ${searchStartDate} and end date ${searchEndDate}.)`)
        }
      } catch (error) {
        const errorMessage = `Error on get papers for author: ${person.lastName}, ${person.firstName}: ${error}`
        failedPapers.push(errorMessage)
        failedAuthors.push(person)
        console.log(errorMessage)
      }
    }, {concurrency: threadCount})

    return {
      'foundPublications': succeededPapers,
      'succeededAuthors': succeededAuthors,
      'errors': failedPapers,
      'failedAuthors': failedAuthors
    }
  }

  async harvestToCsv(searchPersons: NormedPerson[], searchStartDate: Date, searchEndDate: Date) {
    const harvested = await this.harvest(searchPersons, searchStartDate, searchEndDate, 1)
    const outputPapers = _.map(_.flatten(harvested['foundPublications']), pub => {
      pub['source_metadata'] = JSON.stringify(pub['source_metadata'])
      return pub
    })
    

    //write data out to csv
    //console.log(outputScopusPapers)
    await writeCsv({
      path: `../../data/${this.ds.getSourceName}.${searchStartDate.getFullYear}.${moment().format('YYYYMMDDHHmmss')}.csv`,
      data: outputPapers,
    });
  }
}