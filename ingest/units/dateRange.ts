import _ from 'lodash'


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
export function dateRangesOverlapping (startDate1: Date, endDate1: Date, startDate2: Date, endDate2: Date) {
  // assumes startDate1 and startDate2 must be defined, and other value checking
  if (!startDate1 && !endDate1 || !startDate2 && !endDate2){
    return true
  } else if (!startDate1 && !startDate2){
    return true
  } else if (!startDate1 && startDate2){
    if (!endDate2){
      return (endDate1 >= startDate2)
    } else {
      return (endDate1 >= startDate2 && endDate1 <= endDate2)
    }
  } else if 
    ((endDate2 && (startDate2 > endDate2)) || 
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

