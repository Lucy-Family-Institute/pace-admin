import pMap from 'p-map'

class Harvester {
  ds: DataSource

  constructor (ds: DataSource) {
    this.ds = ds
  }

  async wait(ms){
    return new Promise((resolve, reject)=> {
      setTimeout(() => resolve(true), ms );
    });
  }
  
  async randomWait(seedTime, index){
    const waitTime = seedTime * (index % 5)
    //console.log(`Thread Waiting for ${waitTime} ms`)
    await this.wait(waitTime)
  }

  // TODO: Move to utility function
  dateRangesOverlapping (startDate1: Date, endDate1: Date, startDate2: Date, endDate2: Date) {
    // assumes startDate1 and startDate2 must be defined, and other value checking
    if (!startDate1 || 
      !startDate2 || 
      (endDate2 && (startDate2 > endDate2)) || 
      (endDate1 && (startDate1 > endDate1))){
      return false
    } 
    
    if (!endDate1) {
      if (!endDate2) {
        //doesn't matter where start date falls if no end date for each
        return true
      } else if (startDate1 <= endDate2){
        //start date must be before test end date
        return true
      }
    } else if (!endDate2) {
      // if person end date is defined then person end date must be after test start date
      if (endDate1 >= startDate2) {
        return true
      }
    } else if (endDate1 >= startDate2 && startDate1 <= endDate2){
      // in this case start and end defined for both and overlapping ranges
      return true
    }
    // if we get this far the startDate and endDate are not within the test range
    return false
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
        await this.wait(waitInterval)
        // console.log(`Finished wait Getting papers for ${person.lastName}, ${person.firstName}`)
        // check that person start date and end date has some overlap with search date range
        if (this.dateRangesOverlapping(person.startDate, person.endDate, searchStartDate, searchEndDate)) {
          const sourcePublications = await this.ds.getPublicationsByName(person.lastName, person.firstName, searchStartDate, searchEndDate)
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
}