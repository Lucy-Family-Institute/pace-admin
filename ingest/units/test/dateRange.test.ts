import _ from 'lodash'
import { dateRangesOverlapping } from '../dateRange'

test ('dateRangesOverlapping(): test both start and end date of range1 undefined returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = undefined
  const startDate2 = new Date("2020-11-01T00:00:00.000Z")
  const endDate2 = new Date("2020-11-02T00:00:00.000Z")
  expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})
test ('dateRangesOverlapping(): test both start and end date of range2 undefined returns true', () => {
  expect.hasAssertions()
  const startDate2 = undefined
  const endDate2 = undefined
  const startDate1 = new Date("2020-11-01T00:00:00.000Z")
  const endDate1 = new Date("2020-11-02T00:00:00.000Z")
  expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})
test ('dateRangesOverlapping(): test all dates undefined returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = undefined
  const startDate2 = undefined
  const endDate2 = undefined
  expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date equal to end date and end date within date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = new Date("2020-11-01T00:00:00.000Z")
  const endDate1 = new Date("2020-11-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date within date2 range returns true', () => {
  expect.hasAssertions()
  const startDate1 = undefined
  const endDate1 = new Date("2020-11-01T00:00:00.000Z")
  const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date after date2 range returns true', () => {
  expect.hasAssertions()
  // const startDate1 = undefined
  // const endDate1 = new Date("2022-08-01T00:00:00.000Z")
  // const startDate2 = new Date("2020-10-31T00:00:00.000Z")
  // const endDate2 = new Date("2021-09-30T00:00:00.000Z")
  // expect(dateRangesOverlapping(startDate1, endDate1, startDate2, endDate2)).toEqual(true)
})
test ('dateRangesOverlapping(): test range1 start date undefined and end date before date2 range returns false', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range1 end date undefined and start date within date2 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 end date undefined and start date after date2 range returns false', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 end date undefined and start date before date2 range returns true', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range2 start date undefined and end date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date undefined and end date after date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date undefined and end date before date1 range returns false', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range2 end date undefined and start date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 end date undefined and start date after date1 range returns false', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 end date undefined and start date before date1 range returns true', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range1 start date before date2 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date before date2 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date within date2 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date within date2 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date after date2 range and end date after date1 range returns false', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date before date2 range and end date before date1 range returns false', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range2 start date before date1 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date before date1 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date within date1 range and end date within date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date within date1 range and end date after date1 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date after date1 range and end date after date1 range returns false', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range2 start date before date1 range and end date before date1 range returns false', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test invalid values range1 start date after end date returns false', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test invalid values range2 start date after end date returns false', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test times ignored when end date1 time is less than time for start date1 time but dates are equal', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test times ignored when end date2 time is less than time for start date2 time but dates are equal', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test times ignored when end date1 time is less than time for start date2 time but dates are equal', () => {
  expect.hasAssertions()
})
