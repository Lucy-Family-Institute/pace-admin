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

