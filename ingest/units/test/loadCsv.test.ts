import { command as loadCsv } from '../loadCsv'
import _ from 'lodash'

const testCSVPath = './test/fixtures/csv_test.csv'

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