import { getAuthors } from '../cslParser'
import _ from 'lodash'
import Cite from 'citation-js'
import { loadJSONFromFile } from '../loadJSONFromFile'

const cslFilePath = './test/fixtures/default_csl.json'
const cslAuthorMapPath = './test/fixtures/default_expected_author_map.json'
let pubCSL: Cite
let defaultExpectedAuthors
let defaultDoi

beforeAll(async () => {
  pubCSL = loadJSONFromFile(cslFilePath)
  defaultDoi = pubCSL['DOI']
  defaultExpectedAuthors = loadJSONFromFile(cslAuthorMapPath)
})


test('test get authors from the provided csl CITE object', () => {
  expect.hasAssertions()

  console.log(`Expected authors are: ${JSON.stringify(pubCSL, null, 2)}`)
  const authors = getAuthors(pubCSL[defaultDoi])
  expect(authors).toEqual(defaultExpectedAuthors[defaultDoi])
})