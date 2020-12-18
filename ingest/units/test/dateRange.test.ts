import _ from 'lodash'
import { dateRangesOverlapping } from '../dateRange'

test ('dateRangesOverlapping(): test both start and end date of range1 undefined returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test both start and end date of range2 undefined returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test all dates undefined returns true', () => {
  expect.hasAssertions()
})

test ('dateRangesOverlapping(): test range1 start date undefined and end date within date2 range returns true', () => {
  expect.hasAssertions()
})
test ('dateRangesOverlapping(): test range1 start date undefined and end date after date2 range returns true', () => {
  expect.hasAssertions()
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

