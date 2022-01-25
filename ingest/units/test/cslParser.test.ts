import { getAuthors, getAuthorsByLastName } from '../cslParser'
import _ from 'lodash'
import Cite from 'citation-js'
import FsHelper from '../fsHelper'

const cslFilePath = './test/fixtures/default_csl.json'
const cslAuthorMapPath = './test/fixtures/default_expected_author_map.json'
const cslExpectedAuthorPath = './test/fixtures/default_csl_expected_authors.json'
let pubCSL: Cite
let defaultExpectedAuthors
let defaultExpectedAuthorMap
let defaultDoi

beforeAll(async () => {
  pubCSL = FsHelper.loadJSONFromFile(cslFilePath)
  defaultDoi = _.keys(pubCSL)[0]
  defaultExpectedAuthors = FsHelper.loadJSONFromFile(cslExpectedAuthorPath)
  defaultExpectedAuthorMap = FsHelper.loadJSONFromFile(cslAuthorMapPath)
})


test('test get authors from the provided csl CITE object', () => {
  expect.hasAssertions()

  const authors = getAuthors(pubCSL[defaultDoi])
  expect(authors).toEqual(defaultExpectedAuthors[defaultDoi])
})

test('test get authors by last name from the provided csl CITE object', () => {
  expect.hasAssertions()

  const authMap = getAuthorsByLastName(pubCSL[defaultDoi])
  expect(authMap).toEqual(defaultExpectedAuthorMap[defaultDoi])
})