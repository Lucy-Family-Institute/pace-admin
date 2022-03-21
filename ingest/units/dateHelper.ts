import _ from 'lodash'
import CslDate from '../modules/cslDate'
export default class DateHelper {

  public static createDateHelper(){
    return new DateHelper()
  }

  /**
  * Compare two date ranges to know if they are overlapping or not. 
  * If an end date is undefined for a range, then all dates after the start date are included
  * If a start date is undefined for a range, then all dates before the end date are included
  * If invalid values where start date is after end date, then for either date range it will return false
  *
  * @remarks See ./tests/dateRange.test.ts for examples
  *
  * @param startDate1 Date object - Beginning of first range to compare
  * @param endDate1 Date object - End of first range to compare
  * @param startDate2 Date object - Beginning of second range to compare
  * @param endDate2 Date object - End of second range to compare
  *
  * @returns True if they are overlapping, false if not
  */
  dateRangesOverlapping (startDate1: Date, endDate1: Date, startDate2: Date, endDate2: Date) {
    // assumes startDate1 and startDate2 must be defined, and other value checking
    if (!startDate1 && !endDate1 || !startDate2 && !endDate2){
      return true
    } else if (!startDate1 && !startDate2){
      return true
    } else if (!startDate1 && startDate2){
      return (endDate1 >= startDate2)
    } else if (!startDate2 && startDate1){
      return (endDate2 >= startDate1)
    } else if (!endDate2 && !endDate1){
      // if we get this far then both start dates defined
      //doesn't matter where start date falls if no end date for each
      return true
    } else if (!endDate2){
      //range just needs to continue after other start date to overlap
      return (endDate1 >= startDate2)
    } else if (!endDate1){
      return (endDate2 >= startDate1)
    } else if ((startDate2 > endDate2) || (startDate1 > endDate1)){
      // all values defined and check for invalid values now 
      return false
    } else if (startDate1 > endDate2) {
      // if we are this far than all dates are defined and valid, so simple range test
      return false
    } else if (startDate2 > endDate1) {
      return false
    } else if (endDate1 < startDate2) {
      // if we are this far both start dates before the other end dates
      return false
    } else if (endDate2 < startDate1) {
      return false
    } else {
      // if we are this far than overlapping ranges
      return true
    }
      
    // if we get this far the startDate and endDate are not within the test range
    return false
  }

  /**
   * Returns a new Date object correctly initialized given a string of form 'YYYY-MM-DD'
   * 
   * @param dateString 
   */
  getDateObject(dateString: string): Date {
    if (!dateString || dateString === ''){
      return undefined
    } else {
      // remove any time that may be on it already
      let date = _.split(dateString, 'T')[0]
      let dateParts = _.split(date, '/')
      if (dateParts.length === 1) {
        // try splitting by '-' instead
        // console.log('parsing date string by -')
        dateParts = _.split(date, '-')
      }
      if (dateParts.length === 3){
        if (dateParts[0].length > 2){
          const month = (dateParts[1].length < 2 ? `0${dateParts[1]}` : dateParts[1])
          const day = (dateParts[2].length < 2 ? `0${dateParts[2]}` : dateParts[2])
          const year = dateParts[0]
          date = `${year}-${month}-${day}`
        } else {
          const month = (dateParts[0].length < 2 ? `0${dateParts[0]}` : dateParts[0])
          const day = (dateParts[1].length < 2 ? `0${dateParts[1]}` : dateParts[1])
          const year = dateParts[2]
          date = `${year}-${month}-${day}`
        }
      }
      // console.log(`date string is: ${date}`)
      // have to add timezone to make sure not adjusted date to previous date based on local time zone
      const newDate = new Date(`${date}T00:00:00`)
      // console.log(`Date is: ${JSON.stringify(newDate.getTime(), null, 2)}`)
      return newDate
    }
  }

  /**
   * Returns a new Date string gi correctly initialized given a string of form 'YYYY-MM-DD'
   * 
   * @param dateString 
   */
  getDateString(date: Date): string {
      let month = '' + (date.getMonth() + 1)
      let day = '' + date.getDate()
      let year = date.getFullYear()

      if (month.length < 2) 
          month = '0' + month;
      if (day.length < 2) 
          day = '0' + day;

      return [year, month, day].join('-')
  }

  /**
  * Returns a date set to the begining of the month
  * 
  * @param {Date} myDate 
  * @returns {Date}
  */
  beginningOfMonth(myDate: Date){    
    let date = new Date(myDate);
    date.setDate(1)
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);   
    return date;     
  }

  /**
   * Returns a date set to the end of the month
   * 
   * @param {Date} myDate 
   * @returns {Date}
   */
  endOfMonth(myDate: Date){
    let date = new Date(myDate);
    date.setDate(1); // Avoids edge cases on the 31st day of some months
    date.setMonth(date.getMonth() +1);
    date.setDate(0);
    date.setHours(23);
    date.setMinutes(59);
    date.setSeconds(59);
    return date;
  }

  // checks to see an the publication date is within the employment dates of the given person
  // Only year available
  //    -- if only the publication year is available and the person is employed at least one day that year it will return true
  // Only year and month available: 
  //    -- if only the publication year and month are available and the person is employed at least one day that month or earlier it will return true.  
  //    -- if the previous condition is true, if the person has an end date that year it will also return false if the end date is in the previous month of the publication month.
  // Year, month, day available:
  //    -- It will return true if 
  //       -- the persons start date <= the publication date AND
  //       -- if the person does not have an end date - OR - 
  //       -- the person's end date >= the publication date
  // assumes input parameters of types NormedPublication and NormedPerson respectively
  publishedDuringPersonEmploymentDates(pubDate: CslDate, personStartDate: Date, personEndDate: Date): boolean{
    // const personStartDate: Date = person.startDate
    // const personEndDate: Date = person.endDate
    let simplePubDate: CslDate = pubDate // NormedPublication.getCslDate(normedPublication)
    let simplePubCheckStartDate: CslDate
    let simplePubCheckEndDate: CslDate
    let pubCheckStartDate: Date
    let pubCheckEndDate: Date
    if (simplePubDate && simplePubDate.year) {
      if (!simplePubDate.month) {
        simplePubCheckStartDate = {
          year: simplePubDate.year,
          month: 1,
          day: 1
        }
        simplePubCheckEndDate = {
          year: simplePubDate.year,
          month: 12,
          day: 31
        }
        pubCheckStartDate = this.getDateObject(`${simplePubCheckStartDate.year}-${simplePubCheckStartDate.month}-${simplePubCheckStartDate.day}`)
        pubCheckEndDate = this.getDateObject(`${simplePubCheckEndDate.year}-${simplePubCheckEndDate.month}-${simplePubCheckEndDate.day}`)
      } else if (!simplePubDate.day) {
        simplePubCheckStartDate = {
          year: simplePubDate.year,
          month: simplePubDate.month,
          day: 1
        }
        pubCheckStartDate = this.getDateObject(`${simplePubCheckStartDate.year}-${simplePubCheckStartDate.month}-${simplePubCheckStartDate.day}`)
        pubCheckEndDate = this.endOfMonth(pubCheckStartDate)        
      } else {
        pubCheckStartDate = this.getDateObject(`${simplePubDate.year}-${simplePubDate.month}-${simplePubDate.day}`)
        console.log(`After setting, pub check start date is: ${JSON.stringify(pubCheckStartDate.getTime())}`)
        pubCheckEndDate = pubCheckStartDate
      }
      console.log(`Checking overlapping dates for simple start: ${JSON.stringify(simplePubDate, null, 2)}, pub ${JSON.stringify(pubCheckStartDate, null, 2)}, end: ${JSON.stringify(pubCheckEndDate, null, 2)}, personStart: ${JSON.stringify(personStartDate, null, 2)} personEnd: ${JSON.stringify(personEndDate, null, 2)}`)
      return this.dateRangesOverlapping(personStartDate, personEndDate, pubCheckStartDate, pubCheckEndDate)
    } else {
      return false
    }
  }
}