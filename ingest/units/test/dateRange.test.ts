import _ from 'lodash'
import DateHelper from '../dateHelper'

test ('dateRangesOverlapping(): test both start and end date of range1 undefined returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = undefined
  const startDate2 = new Date("2020-11-01T00:00:00.000Z")
  const endDate2 = new Date("2020-11-02T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})
test ('dateRangesOverlapping(): test both start and end date of range2 undefined returns true', () => {
  expect.hasAssertions()
  const startDate2 = undefined
  const endDate2 = undefined
  const startDate1 = new Date("2020-11-01T00:00:00.000Z")
  const endDate1 = new Date("2020-11-02T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})
test ('dateRangesOverlapping(): test all dates undefined returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = undefined
  const startDate2 = undefined
  const endDate2 = undefined
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date equal to end date and end date within date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-11-01T00:00:00.000Z")
  const endDate1 = new Date("2020-11-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date within date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = new Date("2020-11-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date after date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = new Date("2022-08-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date before date2 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = new Date("2020-08-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range1 end date undefined and start date within date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-10-31T00:00:00.000Z")
  const endDate1 = undefined
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 end date undefined and start date after date2 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2022-10-31T00:00:00.000Z")
  const endDate1 = undefined
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range1 end date undefined and start date before date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-11-30T00:00:00.000Z")
  const endDate1 = undefined
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date undefined and end date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = undefined
  const endDate2 = new Date("2020-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date undefined and end date after date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = undefined
  const endDate2 = new Date("2022-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date undefined and end date before date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = undefined
  const endDate2 = new Date("2019-09-30T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range2 end date undefined and start date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-11-30T00:00:00.000Z")
  const endDate2 = undefined
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 end date undefined and start date after date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = new Date("2020-12-01T00:00:00.000Z")
  const endDate2 = undefined
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range2 end date undefined and start date before date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = new Date("2018-12-01T00:00:00.000Z")
  const endDate2 = undefined
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date before date2 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2018-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-12-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date before date2 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2018-10-31T00:00:00.000Z")
  const endDate1 = new Date("2021-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-12-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date within date2 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-10-31T00:00:00.000Z")
  const endDate1 = new Date("2020-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-12-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date within date2 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-10-31T00:00:00.000Z")
  const endDate1 = new Date("2021-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-12-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date after date2 range and end date after date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-10-31T00:00:00.000Z")
  const endDate1 = new Date("2021-11-30T00:00:00.000Z")
  const startDate2 = new Date("2019-11-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range1 start date before date2 range and end date before date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-10-31T00:00:00.000Z")
  const startDate2 = new Date("2019-11-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range2 start date before date1 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2018-11-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date before date1 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2018-11-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date within date1 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2019-11-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date within date1 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2019-11-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range2 start date after date1 range and end date after date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2020-11-01T00:00:00.000Z")
  const endDate2 = new Date("2020-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test range2 start date before date1 range and end date before date1 range returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2018-11-01T00:00:00.000Z")
  const endDate2 = new Date("2018-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test invalid values range1 start date after end date returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2018-11-01T00:00:00.000Z")
  const endDate2 = new Date("2018-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): test invalid values range2 start date after end date returns false', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2020-11-01T00:00:00.000Z")
  const endDate2 = new Date("2018-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(false)
})

test ('dateRangesOverlapping(): when start dates are equal returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-10-01T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2019-10-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): when end dates are equal returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-09-30T00:00:00.000Z")
  const endDate1 = new Date("2019-12-31T00:00:00.000Z")
  const startDate2 = new Date("2019-10-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-31T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): when start and end dates for range 1 are equal is valid range', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-09-30T00:00:00.000Z")
  const endDate1 = new Date("2019-09-30T00:00:00.000Z")
  const startDate2 = new Date("2018-10-01T00:00:00.000Z")
  const endDate2 = new Date("2019-12-31T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): when start and end dates for range 2 are equal is valid range', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2019-09-30T00:00:00.000Z")
  const endDate1 = new Date("2019-10-30T00:00:00.000Z")
  const startDate2 = new Date("2019-10-01T00:00:00.000Z")
  const endDate2 = new Date("2019-10-01T00:00:00.000Z")
  expect(DateHelper.dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('getDateObject returns Date with correct day and time', () => {
  expect.hasAssertions()
  const returnedDate: Date = DateHelper.getDateObject('2018-02-25')
  expect(returnedDate.getFullYear()).toEqual(2018)
  // month is returned in form of 0-11 so need to adjust accordingly
  expect(returnedDate.getMonth()).toEqual(1)
  expect(returnedDate.getDate()).toEqual(25)
})

test ('get DateObject works with date of format MM/DD/YYYY', () => {
  expect.hasAssertions()
  const returnedDate: Date = DateHelper.getDateObject('02/25/2018')
  expect(returnedDate.getFullYear()).toEqual(2018)
  // month is returned in form of 0-11 so need to adjust accordingly
  expect(returnedDate.getMonth()).toEqual(1)
  expect(returnedDate.getDate()).toEqual(25)
})
