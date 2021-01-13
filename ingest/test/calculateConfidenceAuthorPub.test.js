import {
  getPublicationAuthorMap,
  performConfidenceTest
} from '../updateConfidenceReviewStates'
import {getJSONFromFile} from '../getJSONFromFile'
import _ from 'lodash'

const fs = require('fs');

const cslFilePath = './test/fixtures/csl.json'
const pubAuthMapFilePath = './test/fixtures/expectedAuthorMap.json'
let pubAuthorMaps
let pubCSLs
let testAuthor
let publication

beforeAll(async () => {
  pubAuthorMaps = await getJSONFromFile(pubAuthMapFilePath)
  pubCSLs = await getJSONFromFile(cslFilePath)
  testAuthor = {
    names:[{
      'lastName':'liu',
      'firstInitial':'f',
      'firstName':'fang'
    }],
  }

  publication = {
    doi: '10.1039/c8sc05273e',
    confirmedAuthors: [{
      'lastName':'Lu',
      'firstName':'Xin',
      'fullName':'Xin Lu'
    }]
  }
})

test('testing get publication author map from csl', async () => {
  expect.hasAssertions();

//   _.each(_.keys(pubCSLs), async (doi) => {
//     const foundPubAuthorMap = await getPublicationAuthorMap(pubCSLs[doi])
//     expect(pubAuthorMaps[doi]).toEqual(foundPubAuthorMap)
//   })
})

test('testing perform confidence test', async () => {
  expect.hasAssertions();

//   // const pubAuthorMaps = await getJSONFromFile(pubAuthMapFilePath)
//   // const pubCSLs = await getJSONFromFile(cslFilePath)

//   const confidenceType = {name: 'lastname'}
//   _.each(_.keys(pubCSLs), async (doi) => {
//     const matchedAuthors = await performConfidenceTest(confidenceType, publication['confirmedAuthors'], testAuthor, pubAuthorMaps[publication['doi']])
//     expect(matchedAuthors).toBe(['jedi'])
//   })
  
})

// performauthorconfidencetests
// publicationauthormap
// performconfidencetest

//add test for performconfidencetest
//add full suite of author objects