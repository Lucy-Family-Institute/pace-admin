import {getPublicationAuthorMap} from '../updateConfidenceReviewStates'
import {getJSONFromFile} from '../getJSONFromFile'
import _ from 'lodash'

const fs = require('fs');

const testAuthor = {
  names:[{
    'lastName':'liu',
    'firstInitial':'f',
    'firstName':'fang'
  }],
}

const publication = {
  doi: '10.1039/c8sc05273e',
  confirmedAuthors: [{
    'lastName':'Lu',
    'firstName':'Xin',
    'fullName':'Xin Lu'
  }]
}

test('testing get publication author map from csl', async () => {
  expect.hasAssertions();

  console.log('Current directory: ' + process.cwd());

  const cslFilePath = './test/fixtures/csl.json'
  const pubAuthMapFilePath = './test/fixtures/expectedAuthorMap.json'
  const pubCSLs = await getJSONFromFile(cslFilePath)
  const pubAuthorMaps = await getJSONFromFile(pubAuthMapFilePath)
  _.each(_.keys(pubCSLs), async (doi) => {
    const foundPubAuthorMap = await getPublicationAuthorMap(pubCSLs[doi])
    expect(pubAuthorMaps[doi]).toEqual(foundPubAuthorMap)
  })
})

// performauthorconfidencetests
// publicationauthormap
// performconfidencetest

//move csl sample to json
//add test for performconfidencetest
//add full suite of author objects