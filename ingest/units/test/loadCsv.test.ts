import { command as loadCsv } from '../loadCsv'
import _ from 'lodash'

const testCSVPath = './test/fixtures/csv_test.csv'

const columnMapNoLowercase = {
  ID: 'id',
  'Given_name': 'givenName',
  'Family_Name': 'familyName',
  'Start_Date': 'startDate',
  'End_Date': 'endDate'
}

const expectedColumnMapNoLowercase = [
  'id',
  'givenName',
  'familyName',
  'Email',
  'Position_Title',
  'Institution_Id',
  'startDate',
  'endDate'
]

const columnMapLowercaseKeysOnly = {
  'ID': 'id',
  'Given_name': 'givenName',
  'Family_Name': 'familyName',
  'Start_Date': 'startDate',
  'End_Date': 'endDate'
}

const expectedColumnMapLowercaseKeys = [
  'id',
  'givenName',
  'familyName',
  'Email',
  'Position_Title',
  'Institution_Id',
  'startDate',
  'endDate'
]

const columnMapAllLowercase = {
  'id': 'id',
  'given_name': 'givenname',
  'family_name': 'familyname',
  'start_date': 'startdate',
  'end_date': 'enddate'
}

const expectedColumnMapAllLowercase = [
  'id',
  'givenname',
  'familyname',
  'Email',
  'Position_Title',
  'Institution_Id',
  'startdate',
  'enddate'
]

const expectedUnchangedColumns = [
  'id',
  'Given_name',
  'Family_Name',
  'Email',
  'Position_Title',
  'Institution_Id',
  'Start_Date',
  'End_Date'
]
const expectedLowerColumns = [
  'id',
  'given_name',
  'family_name',
  'email',
  'position_title',
  'institution_id',
  'start_date',
  'end_date'
]

test('test column names converted to lowercase when loading csv and true provided as forceLowerCaseColumns parameter', async () => {
  expect.hasAssertions();

  const csvData: any = await loadCsv({
    path: testCSVPath,
    lowerCaseColumns: true
  })
  expect(_.keys(csvData[0])).toEqual(expectedLowerColumns)
})

test('test column names not changed when loading csv and false provided as forceLowerCaseColumns parameter', async () => {
  expect.hasAssertions();

  const csvData: any = await loadCsv({
    path: testCSVPath,
    lowerCaseColumns: false
  })
  expect(_.keys(csvData[0])).toEqual(expectedUnchangedColumns)
})

test('test column names not changed when loading csv and no forceLowerCaseColumns parameter provided', async () => {  
  expect.hasAssertions();

  const csvData: any = await loadCsv({
    path: testCSVPath
  })
  expect(_.keys(csvData[0])).toEqual(expectedUnchangedColumns)
})

test('test load csv works with column map with no lowerCase keys or values', async () => {
  expect.hasAssertions()
  const csvData: any = await loadCsv({
    path: testCSVPath,
    columnNameMap: columnMapNoLowercase
  })
  expect(_.keys(csvData[0])).toEqual(expectedColumnMapNoLowercase)
})

test('test load csv works with column map with lowerCase columnNames and non lowerCase mapped column names', async () => {
  expect.hasAssertions()
  const csvData: any = await loadCsv({
    path: testCSVPath,
    columnNameMap: columnMapLowercaseKeysOnly
  })
  expect(_.keys(csvData[0])).toEqual(expectedColumnMapLowercaseKeys)
})
test('test load csv works with column map with lowerCase propertyNames and lowerCase mapped column names', async () => {
  expect.hasAssertions()
  const csvData: any = await loadCsv({
    path: testCSVPath,
    columnNameMap: columnMapAllLowercase
  })
  expect(_.keys(csvData[0])).toEqual(expectedColumnMapAllLowercase)
})