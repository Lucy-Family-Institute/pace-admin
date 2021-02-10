import _ from 'lodash'
import NormedPerson from '../normedPerson'
import { getDateObject } from '../../units/dateRange'

const testCSVPath = './test/fixtures/persons_2020.csv'

const propMapNoLowercase = {
  'ID': 'ID',
  'Given_name': 'givenName',
  'Family_Name': 'familyName',
  'Start_Date': 'startDate',
  'End_Date': 'endDate'
}
const propMapLowercaseKeysOnly = {
  id: 'ID',
  'given_name': 'givenName',
  'family_name': 'familyName',
  'start_date': 'startDate',
  'end_date': 'endDate'
}
const propMapAllLowercase = {
  'id': 'id',
  'given_name': 'givenname',
  'family_name': 'familyname',
  'start_date': 'startdate',
  'end_date': 'enddate'
}

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

const defaultExpectedPersons = [
  {
    id: 1,
    familyName: 'Alber',
    givenNameInitial: 'M',
    givenName: 'Mark',
    startDate: getDateObject('2017-01-01'),
    endDate: getDateObject('2017-12-31'),
    sourceIds: {
      scopusAffiliationId: undefined
    }
  }
]

test('test loadFromCSV', async () => {
  expect.hasAssertions()
  const persons: NormedPerson[] = await NormedPerson.loadFromCSV(testCSVPath)
  expect(persons[0]).toEqual(defaultExpectedPersons[0])
})