import {
  getPublicationAuthorMap,
  performConfidenceTest
} from '../updateConfidenceReviewStates'
import {loadJSONFromFile} from '../units/loadJSONFromFile'
import _ from 'lodash'

const fs = require('fs');

const cslFilePath = './test/fixtures/default_csl.json'
const pubAuthMapFilePath = './test/fixtures/default_expected_author_map.json'
const expectedMatchedPubAuthMapFilePath = './test/fixtures/default_expected_matched_authors.json'
const pubConfirmedAuthMapFilePath = './test/fixtures/default_confirmed_authors.json'
let pubAuthorMaps
let pubCSLs
let expectedMatchedPubAuthMap
let pubConfirmedAuthMap

const defaultTestAuthor = {
  names:[{
    'lastName':'liu',
    'firstInitial':'f',
    'firstName':'fang'
  }],
}

beforeAll(async () => {
  pubAuthorMaps = loadJSONFromFile(pubAuthMapFilePath)
  pubCSLs = loadJSONFromFile(cslFilePath)
  expectedMatchedPubAuthMap = loadJSONFromFile(expectedMatchedPubAuthMapFilePath)
  pubConfirmedAuthMap = loadJSONFromFile(pubConfirmedAuthMapFilePath)
})

test('testing get publication author map from csl', async () => {
  expect.hasAssertions();

  _.each(_.keys(pubCSLs), async (doi) => {
    const foundPubAuthorMap = getPublicationAuthorMap(pubCSLs[doi])
    expect(pubAuthorMaps[doi]).toEqual(foundPubAuthorMap)
  })
})

test('testing perform confidence test', async () => {
  expect.hasAssertions();

  const confidenceType = {name: 'lastname'}
  _.each(_.keys(pubCSLs), (doi) => {
    const matchedAuthors = performConfidenceTest(confidenceType, pubConfirmedAuthMap[doi], defaultTestAuthor, pubAuthorMaps[doi])
    expect(matchedAuthors).toEqual(expectedMatchedPubAuthMap[doi])
  })
  
})

// performauthorconfidencetests

//add test for performconfidencetest
//add full suite of author objects