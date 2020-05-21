import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'
import readConfidenceTypes from './gql/readConfidenceTypes'
import readPersons from '../client/src/gql/readPersons'
import readPersonPublications from './gql/readPersonPublications'
import insertConfidenceSets from './gql/insertConfidenceSets'
import insertConfidenceSetItems from './gql/insertConfidenceSetItems'
import pMap from 'p-map'
import { command as loadCsv } from './units/loadCsv'
import Cite from 'citation-js'

const Fuse = require('fuse.js')
const client = new ApolloClient({
    link: createHttpLink({
      uri: 'http://localhost:8002/v1/graphql',
      headers: {
        'x-hasura-admin-secret': 'mysecret'
      },
      fetch: fetch as any
    }),
    cache: new InMemoryCache()
  })
// const apolloUri = process.env.GRAPHQL_END_POINT
// const httpLink = createHttpLink({
//   uri: apolloUri,
//   fetch: fetch as any,
//   credentials: 'include'
// })

// // Create the apollo client
// const client = new ApolloClient({
//   link: httpLink,
//   cache: new InMemoryCache()
// })

async function getPersonPublications (personId) {
  const queryResult = await client.query(readPersonPublications(personId))
  return queryResult.data.persons_publications
}

async function getAllSimplifiedPersons () {
  const queryResult = await client.query(readPersons())

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    const names = []
    names.push({
      lastName: person.family_name.toLowerCase(),
      firstInitial: person.given_name[0].toLowerCase(),
      firstName: person.given_name.toLowerCase(),
    })
    // add all name variations
    if (person.persons_name_variances) {
      _.each (person.persons_name_variances, (nameVariance) => {
        names.push({
          lastName: nameVariance.family_name.toLowerCase(),
          firstInitial: nameVariance.given_name[0].toLowerCase(),
          firstName: nameVariance.given_name.toLowerCase()
        })
      })
    }
    return {
      id: person.id,
      names: names,
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

async function wait(ms){
  return new Promise((resolve, reject)=> {
    setTimeout(() => resolve(true), ms );
  });
}

async function randomWait(seedTime, index){
  const waitTime = 1000 * (index % 5)
  //console.log(`Thread Waiting for ${waitTime} ms`)
  await wait(waitTime)
}

async function getPapersByDoi (csvPath) {
  console.log(`Loading Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const authorPapers: any = await loadCsv({
     path: csvPath
    })

    //console.log(`Getting Keys for author papers`)

    //normalize column names to all lowercase
    const authorLowerPapers = _.mapValues(authorPapers, function (paper) {
      return _.mapKeys(paper, function (value, key) {
        return key.toLowerCase()
      })
    })

    console.log(`After lowercase ${_.keys(authorLowerPapers[0])}`)

    const papersByDoi = _.groupBy(authorLowerPapers, function(paper) {
      //strip off 'doi:' if present
      //console.log('in loop')
      return _.replace(paper['doi'], 'doi:', '') 
    })
    //console.log('Finished load')
    return papersByDoi
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
} 

async function getConfirmedAuthorsByDoi (papersByDoi, csvColumn) {
  const confirmedAuthorsByDoi = _.mapValues(papersByDoi, function (papers) {
    //console.log(`Parsing names from papers ${JSON.stringify(papers,null,2)}`)
    return _.mapValues(papers, function (paper) {
      const unparsedName = paper[csvColumn]
      //console.log(`Parsing name: ${unparsedName}`)
      const parsedName =  humanparser.parseName(unparsedName)
      //console.log(`Parsed Name is: ${JSON.stringify(parsedName,null,2)}`)
      return parsedName
    })
  })
  return confirmedAuthorsByDoi
}

async function getConfirmedAuthorsByDoiFromCSV (path) {
  try {
    const papersByDoi = await getPapersByDoi(path)
    const dois = _.keys(papersByDoi)
    console.log(`Papers by DOI Count: ${JSON.stringify(dois.length,null,2)}`)
   
    const confirmedAuthorColumn = 'nd author (last, first)'
    const firstDoiConfirmedList = papersByDoi[dois[0]]
  
    //check if confirmed column exists first, if not ignore this step
    let confirmedAuthorsByDoi = {}
    if (papersByDoi && dois.length > 0 && firstDoiConfirmedList && firstDoiConfirmedList.length > 0 && firstDoiConfirmedList[0][confirmedAuthorColumn]){
      //get map of DOI's to an array of confirmed authors from the load table
      confirmedAuthorsByDoi = await getConfirmedAuthorsByDoi(papersByDoi, confirmedAuthorColumn)
     
      // console.log(`Confirmed Authors By Doi are: ${JSON.stringify(confirmedAuthorsByDoi,null,2)}`)
    }
    return confirmedAuthorsByDoi
  } catch (error){
    console.log(`Error on load confirmed authors: ${error}`)
    return {}
  }
}

// person map assumed to be a map of simplename to simpleperson object
// author map assumed to be doi mapped to two arrays: first authors and other authors
// returns a map of person ids to the person object and confidence value for any persons that matched coauthor attributes
// example: {1: {person: simplepersonObject, confidence: 0.5}, 51: {person: simplepersonObject, confidence: 0.8}}
async function matchPeopleToPaperAuthors(personMap, authors, confirmedAuthors){

  // match to last name
  // match to first initial (increase confidence)
  let matchedPersonMap = new Map()

  // console.log(`Testing PersonMap: ${JSON.stringify(personMap,null,2)} to AuthorMap: ${JSON.stringify(authorMap,null,2)}`)
  _.each(authors, async (author) => {
    //console.log(`Testing Author for match: ${author.family}, ${author.given}`)

    //check if persons last name in author list, if so mark a match
    if(_.has(personMap, _.lowerCase(author.family))){
      //console.log(`Matching last name found: ${author.family}`)

      let firstInitialFound = false
      let affiliationFound = false
      let firstNameFound = false
      //check for any matches of first initial or affiliation
      _.each(personMap[_.lowerCase(author.family)], async (testPerson) => {
        let confidenceVal = 0.0

        //match on last name found increment confidence by 0.3
        confidenceVal += 0.3
        
        if (_.lowerCase(author.given)[0] === testPerson.firstInitial){
          firstInitialFound = true

          if (author.given.toLowerCase()=== testPerson.firstName){
            firstNameFound = true
          }
          // split the given name based on spaces
          const givenParts = _.split(author.given, ' ')
          _.each(givenParts, (part) => {
            if (_.lowerCase(part) === testPerson.firstName){
              firstNameFound = true
            }
          })
        }
        if(!_.isEmpty(author.affiliation)) {
          if(/notre dame/gi.test(author.affiliation[0].name)) {
            affiliationFound = true
          }
        }

        if (affiliationFound) confidenceVal += 0.15
        if (firstInitialFound) {
          confidenceVal += 0.15
          if (firstNameFound) {
            confidenceVal += 0.25
          }
          //check if author in confirmed list and change confidence to 0.99 if found
          if (confirmedAuthors){
            _.each(confirmedAuthors, function (confirmedAuthor){
              if (_.lowerCase(confirmedAuthor.lastName) === testPerson.lastName &&
                _.lowerCase(confirmedAuthor.firstName) === testPerson.firstName){
                // console.log(`Confirmed author found: ${JSON.stringify(testPerson,null,2)}, making confidence 0.99`)
                confidenceVal = 0.99
              }
            })
          }
        }

        //add person to map with confidence value > 0
        if (confidenceVal > 0) {
          console.log(`Match found for Author: ${author.family}, ${author.given}`)
          matchedPersonMap[testPerson.id] = {'person': testPerson, 'confidence': confidenceVal}
          //console.log(`After add matched persons map is: ${JSON.stringify(matchedPersonMap,null,2)}`)
        } 
      })
    } else {
      //console.log(`No match found for Author: ${author.family}, ${author.given}`)
    }
  })

  //console.log(`After tests matchedPersonMap is: ${JSON.stringify(matchedPersonMap,null,2)}`)
  return matchedPersonMap
}

async function getConfidenceTypesByRank() {
  const queryResult = await client.query(readConfidenceTypes())
  const confidenceTypesByRank = _.groupBy(queryResult.data.confidence_type, (confidenceType) => {
    return confidenceType.rank
  })
  return confidenceTypesByRank
}

async function getCSLAuthors(paperCsl){

  const authMap = {
    firstAuthors : [],
    otherAuthors : []
  }
  
  let authorCount = 0
  //console.log(`Before author loop paper csl: ${JSON.stringify(paperCsl,null,2)}`)
  _.each(paperCsl.author, async (author) => {
    // skip if family_name undefined
    if (author.family != undefined){
      //console.log(`Adding author ${JSON.stringify(author,null,2)}`)
      authorCount += 1
            
      //if given name empty change to empty string instead of null, so that insert completes
      if (author.given === undefined) author.given = ''

      if (_.lowerCase(author.sequence) === 'first' ) {
        //console.log(`found first author ${ JSON.stringify(author) }`)
        authMap.firstAuthors.push(author)
      } else {
        //console.log(`found add\'l author ${ JSON.stringify(author) }`)
        authMap.otherAuthors.push(author)
      }
    }
  })

  //add author positions
  authMap.firstAuthors = _.forEach(authMap.firstAuthors, function (author, index){
    author.position = index + 1
  })

  authMap.otherAuthors = _.forEach(authMap.otherAuthors, function (author, index){
    author.position = index + 1 + authMap.firstAuthors.length
  })

  //concat author arrays together
  const authors = _.concat(authMap.firstAuthors, authMap.otherAuthors)

  //console.log(`Author Map found: ${JSON.stringify(authMap,null,2)}`)
  return authors
}

async function getPublicationAuthorMap (publicationCsl) {
  //retrieve the authors from the record and put in a map, returned above in array, but really just one element
  const authors = await getCSLAuthors(publicationCsl)
  // group authors by last name
  //create map of last name to array of related persons with same last name
  const authorMap = _.transform(authors, function (result, value) {
    const lastName = _.toLower(value.family)
    return (result[lastName] || (result[lastName] = [])).push(value)
  }, {})
  return authorMap
}

function getAuthorLastNames (author) {
  // console.log(`Getting author last names for ${JSON.stringify(author, null, 2)}`)
  const lastNames = _.transform(author['names'], function (result, value) {
    result.push(value['lastName'])
    return true
  }, [])
  return lastNames
}

// replace diacritics with alphabetic character equivalents
function normalizeString (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    const norm1 = newValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // the u0027 also normalizes the curly apostrophe to the straight one
    const norm2 = norm1.replace(/[\u2019]/g, '\u0027')
    // remove periods and other remaining special characters
    const norm3 = norm2.replace(/[&\/\\#,+()$~%.'":*?<>{}!]/g,'');
    return norm3
  } else {
    return value
  }
}

// remove diacritic characters (used later for fuzzy matching of names)
function normalizeObjectProperties (object, properties) {
  const newObject = _.clone(object)
  _.each (properties, (property) => {
    newObject[property] = normalizeString(newObject[property])
  })
  return newObject
}

// replace diacritics with alphabetic character equivalents
function removeSpaces (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    let norm =  newValue.replace(/\s/g, '')
    // console.log(`before replace space: ${value} after replace space: ${norm}`)
    return norm
  } else {
    return value
  }
}

// remove diacritic characters (used later for fuzzy matching of names)
function removeSpacesObjectProperities (object, properties) {
  const newObject = _.clone(object)
  _.each (properties, (property) => {
    newObject[property] = removeSpaces(newObject[property])
  })
  return newObject
}

function lastNameMatchFuzzy (last, lastKey, nameMap){
  // first normalize the diacritics
  const testNameMap = _.map(nameMap, (name) => {
     return normalizeObjectProperties(name, [lastKey])
  })
  // normalize last name checking against as well
  const testLast = normalizeString(last)
  // console.log(`After diacritic switch ${JSON.stringify(nameMap, null, 2)} converted to: ${JSON.stringify(testNameMap, null, 2)}`)
  const lastFuzzy = new Fuse(testNameMap, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: [lastKey],
    findAllMatches: true,
    threshold: 0.067,
  });

  const lastNameResults = lastFuzzy.search(testLast)
  // console.log(`For testing: ${testLast} Last name results: ${JSON.stringify(lastNameResults, null, 2)}`)
  return lastNameResults.length > 0 ? lastNameResults[0] : null
}

function nameMatchFuzzy (searchLast, lastKey, searchFirst, firstKey, nameMap) {
  // first normalize the diacritics
  // and if any spaces in search string replace spaces in both fields and search map with underscores for spaces
  const testNameMap = _.map(nameMap, (name) => {
    let norm = normalizeObjectProperties(name, [lastKey, firstKey])
    norm = removeSpacesObjectProperities(norm, [firstKey])
    norm = removeSpacesObjectProperities(norm, [lastKey])
    return norm
  })
  // normalize name checking against as well
  let testLast = normalizeString(searchLast)
  let testFirst = normalizeString(searchFirst)

  // console.log(`search first: ${searchFirst} test first after norm: ${testFirst}`)
  testFirst = removeSpaces(testFirst)
  testLast = removeSpaces(testLast)


  const lastFuzzy = new Fuse(testNameMap, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: [lastKey],
    findAllMatches: true,
    threshold: 0.067,
  });

  // check each phrase split by a space if more than one token
  const lastNameResults = lastFuzzy.search(testLast);
  // console.log(`Last name match results are: ${JSON.stringify(lastNameResults, null, 2)}`)
  // need to reduce down to arrays of "item" value to then pass again to Fuse
  const reducedLastNameResults = _.map(lastNameResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  // console.log(`Reduced last name results are: ${JSON.stringify(reducedLastNameResults, null, 2)}`)
  const fuzzyHarperFirst = new Fuse(reducedLastNameResults, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: [firstKey],
    findAllMatches: true,
    threshold: 0.001,
  });
  // console.log(`search first: ${searchFirst} test first is: ${testFirst}`)
  const results = fuzzyHarperFirst.search(testFirst);
  // console.log(`First name match results are: ${JSON.stringify(results, null, 2)}`)
  return results.length > 0 ? results[0] : null;
}

function testAuthorLastName (author, publicationAuthorMap) {
  //check for any matches of last name
  // get array of author last names
  const lastNames = getAuthorLastNames(author)
  // console.log(`Author last names are: ${JSON.stringify(lastNames)}`)
  let matchedAuthors = {}
  _.each(_.keys(publicationAuthorMap), (pubLastName) => {
    _.each(lastNames, (lastName) => {
      // console.log (`Checking pub lastname ${_.toLower(pubLastName)} against test lastname: ${_.toLower(lastName)}`)
      if (lastNameMatchFuzzy(lastName, 'family', publicationAuthorMap[pubLastName])) {
        matchedAuthors[pubLastName] = publicationAuthorMap[pubLastName]
        return false
      }
    })
  })
  return matchedAuthors
}

function testConfirmedAuthor (author, publicationAuthorMap, confirmedAuthorMap) {
  //check if author in confirmed list and change confidence to 0.99 if found
  //console.log(`Testing for confirmed authors: ${JSON.stringify(confirmedAuthorMap, null, 2)} against author: ${JSON.stringify(author, null, 2)}`)
  let matchedAuthors = new Map()
  if (confirmedAuthorMap && confirmedAuthorMap.length > 0){
    _.each(author['names'], (name) => {
      // console.log(`Checking ${JSON.stringify(name, null, 2)} against confirmed authors ${JSON.stringify(confirmedAuthorMap, null, 2)}`)
      if (nameMatchFuzzy(name.lastName, 'lastName', name.firstName.toLowerCase(), 'firstName', confirmedAuthorMap)) {
        // find pub authors with fuzzy match to confirmed author
        // console.log(`matched last name confirmed author ${name.lastName}`)
        _.each(_.keys(publicationAuthorMap), (pubLastName) => {
          // find the relevant pub authors and return as matched
          // no guarantee the pub author name matches the last name for the confirmed name
          // so need to find a last name variant that does match
          // console.log(`Found match and checking for name for author map: ${JSON.stringify(publicationAuthorMap, null, 2)}`)
          if (lastNameMatchFuzzy(pubLastName, 'lastName', author.names)) {
            matchedAuthors[pubLastName] = publicationAuthorMap[pubLastName]
          }
        })
      } else {
        // console.log(`No match Checking ${JSON.stringify(name, null, 2)} against confirmed authors ${JSON.stringify(confirmedAuthorMap, null, 2)}`)
      }
    })
  }
  return matchedAuthors
}

// only call this method if last name matched
function testAuthorGivenNamePart (author, publicationAuthorMap, initialOnly) {
  // really check for last name and given name intial match for one of the name variations
  // group name variations by last name
  const nameVariations = _.groupBy(author['names'], 'lastName')
  let matchedAuthors = new Map()
  // console.log(`Checking given name match: ${JSON.stringify(nameVariations, null, 2)} author map: ${JSON.stringify(publicationAuthorMap, null, 2)}`)
  _.each(_.keys(nameVariations), (nameLastName) => {
    _.each(_.keys(publicationAuthorMap), (pubLastName) => {
      // check for a fuzzy match of name variant last names to lastname in pub author list
      if (lastNameMatchFuzzy(pubLastName, 'lastName', nameVariations[nameLastName])){
        //console.log(`Found lastname match pub: ${pubLastName} and variation: ${nameLastName}`)
        // now check for first initial or given name match
        // split the given name based on spaces
        
        _.each(publicationAuthorMap[pubLastName], (pubAuthor) => {
          // split given names into separate parts and check initial against each one
          let matched = false
          const givenParts = _.split(pubAuthor.given, ' ')
          //console.log(`Testing given parts: ${JSON.stringify(givenParts, null, 2)}`)
          let firstKey = 'firstName'
          _.each(givenParts, (part) => {
            if (initialOnly){
              part = part[0]
              firstKey = 'firstInitial'
            } 
            if (nameMatchFuzzy(pubLastName, 'lastName', part.toLowerCase(), firstKey, nameVariations[nameLastName])) {
              (matchedAuthors[pubLastName] || (matchedAuthors[pubLastName] = [])).push(pubAuthor)
              matched = true
            }
          })
          // if not matched try matching without breaking it into parts
          if (!matched && givenParts.length > 1) {
            if (nameMatchFuzzy(pubLastName, 'lastName', pubAuthor.given, firstKey, nameVariations[nameLastName])) {
              (matchedAuthors[pubLastName] || (matchedAuthors[pubLastName] = [])).push(pubAuthor)
            }
          }
        })
      }
    })
  })
  return matchedAuthors
}

// only call this method if last name matched
function testAuthorGivenNameInitial (author, publicationAuthorMap) {
  return testAuthorGivenNamePart(author, publicationAuthorMap, true)
}

// only call this method if last name matched
function testAuthorGivenName (author, publicationAuthorMap) {
  return testAuthorGivenNamePart(author, publicationAuthorMap, false)
}

// assumes passing in authors that matched previously
function testAuthorAffiliation (author, publicationAuthorMap) {
  const nameVariations = _.groupBy(author['names'], 'lastName')
  let matchedAuthors = new Map()
  _.each(_.keys(nameVariations), (nameLastName) => {
    _.each(_.keys(publicationAuthorMap), (pubLastName) => {
      // check for a fuzzy match of name variant last names to lastname in pub author list
      if (lastNameMatchFuzzy(pubLastName, 'lastName', nameVariations[nameLastName])){
        _.each(publicationAuthorMap[pubLastName], async (pubAuthor) => {
          if(!_.isEmpty(pubAuthor.affiliation)) {
            if(/notre dame/gi.test(pubAuthor.affiliation[0].name)) {
              (matchedAuthors[nameLastName] || (matchedAuthors[nameLastName] = [])).push(pubAuthor)
            }
          }
        })
      }
    })
  })
  return matchedAuthors
}

// returns true/false from a test called for the specific name passed in
async function performConfidenceTest (confidenceType, publicationCsl, author, publicationAuthorMap, confirmedAuthors){
  if (confidenceType.name === 'lastname') {
    return testAuthorLastName(author, publicationAuthorMap)
  } else if (confidenceType.name === 'confirmed_by_author') {
     // needs to test against confirmed list
     const matchedAuthors = testConfirmedAuthor(author, publicationAuthorMap, confirmedAuthors)
     // console.log(`Matches authors for ${confidenceTypeName}: ${JSON.stringify(matchedAuthors, null, 2)}`)
     return matchedAuthors
  } else if (confidenceType.name === 'given_name_initial') {
    return testAuthorGivenNameInitial(author, publicationAuthorMap)
  } else if (confidenceType.name === 'given_name') {
    return testAuthorGivenName(author, publicationAuthorMap)
  } else if (confidenceType.name === 'university_affiliation') {
    return testAuthorAffiliation(author, publicationAuthorMap)
  } else if (confidenceType.name === 'common_coauthor') {
    // need the publication for this test
    // do nothing for now, and return an empty set
    return {}
  } else if (confidenceType.name === 'subject_area') {
    // do nothing for now and return an empty set
    return {}
  } else {
    return {}
  }
}

async function performAuthorConfidenceTests (author, publicationCsl, confirmedAuthors, confidenceTypesByRank) {
  // array of arrays for each rank sorted 1 to highest number
  // iterate through each group by rank if no matches in one rank, do no execute the next rank
  const sortedRanks = _.sortBy(_.keys(confidenceTypesByRank), (value) => { return value })
  // now just push arrays in order into another array

  //update to current matched authors before proceeding with next tests
  let publicationAuthorMap = await getPublicationAuthorMap(publicationCsl)
  // initialize map to store passed tests by rank
  let passedConfidenceTests = {}
  let stopTesting = false
  await pMap (sortedRanks, async (rank) => {
    // console.log(`Testing for rank: ${rank} author: ${JSON.stringify(author, null, 2)}`)
    let matchFound = false
    // after each test need to union the set of authors matched before moving to next level
    let matchedAuthors = {}
    if (!stopTesting){
      await pMap(confidenceTypesByRank[rank], async (confidenceType) => {
        // need to update to make publicationAuthorMap be only ones that matched last name for subsequent tests
        let currentMatchedAuthors = await performConfidenceTest(confidenceType, publicationCsl, author, publicationAuthorMap, confirmedAuthors)
        // console.log(`${confidenceType['name']} Matched Authors Found: ${JSON.stringify(matchedAuthors, null, 2)}`)
        if (currentMatchedAuthors && _.keys(currentMatchedAuthors).length > 0){
          (passedConfidenceTests[rank] || (passedConfidenceTests[rank] = {}))[confidenceType['name']] = {
            confidenceTypeId: confidenceType['id'],
            confidenceTypeName : confidenceType['name'],
            testAuthor : author,
            matchedAuthors : currentMatchedAuthors
          }
          // console.log(`Matched authors found for rank: ${rank}, test: ${confidenceType['name']}`)
          // union any authors that are there for each author last name
          _.each(_.keys(currentMatchedAuthors), (matchedLastName) => {
            if (matchedAuthors[matchedLastName]) {
              // need to merge with existing list
              matchedAuthors[matchedLastName] = _.unionWith(matchedAuthors[matchedLastName], currentMatchedAuthors[matchedLastName], _.isEqual)
            } else {
              matchedAuthors[matchedLastName] = currentMatchedAuthors[matchedLastName]
            }
          })
          // console.log(`Test ${confidenceType['name']} found matches: ${JSON.stringify(matchedAuthors, null, 2)}`)
        }
      }, {concurrency: 3})
      if (_.keys(matchedAuthors).length <= 0){
        // stop processing and skip next set of tests
        // console.log(`Stopping tests as no matches found as test rank: ${rank} for author ${JSON.stringify(author, null, 2)}`)
        stopTesting = true
      } else {
        // set publication author map for next iteration to union set of authors that were matched in current level of tests
        publicationAuthorMap = matchedAuthors
        // console.log(`Matched authors found for tests rank: ${rank}, matched authors: ${JSON.stringify(matchedAuthors, null, 2)}`)
      }
    }
  }, {concurrency: 1})
  return passedConfidenceTests
}

const confidenceMetrics = {
  1:  {
    base: 0.3,
    additiveCoefficient: 0.5
  },
  2: {
    base: 0.15,
    additiveCoefficient: 1.0,
  },
  3: {
    base: 0.25,
    additiveCoefficient: 2.0
  },
  confirmed_by_author: {
    base: 0.99,
    additiveCoefficient: 1.0
  }
}

function getConfidenceValue (rank, confidenceTypeName, index) {
  // start by setting metric to default rank metric
  let confidenceMetric = confidenceMetrics[rank]
  if (confidenceMetrics[confidenceTypeName]) {
    // specific metric found for test type and use that instead of default rank value
    confidenceMetric = confidenceMetrics[confidenceTypeName]
  }
  if (index > 0) {
    // if not first one multiply by the additive coefficient
    return confidenceMetric.base * confidenceMetric.additiveCoefficient
  } else {
    return confidenceMetric.base
  }
}

//returns a new map of rank -> test name -> with property calculatedValue and comment added
async function calculateAuthorConfidence (passedConfidenceTests) {
  // calculate the confidence for each where first uses full value and each add'l uses
  // partial increment to increase confidence slightly for this category of tests
  let newPassedConfidenceTests = {}
  _.each(_.keys(passedConfidenceTests), async (rank) => {
    let index = 0
    let newConfidenceTests = {}
    _.each(passedConfidenceTests[rank], (confidenceTest) => {
      newConfidenceTests[confidenceTest.confidenceTypeName] = _.clone(confidenceTest)
      _.set(newConfidenceTests[confidenceTest.confidenceTypeName], 'confidenceValue', getConfidenceValue(rank, confidenceTest.confidenceTypeName, index))
      _.set(newConfidenceTests[confidenceTest.confidenceTypeName], 'confidenceComment', `Value calculated for rank: ${rank} index: ${index}`)
      index += 1
    })
    newPassedConfidenceTests[rank] = newConfidenceTests
  })
  return newPassedConfidenceTests
} 

// Calculate the confidence of a match for each given test author and publication
//
// publication: publication to test if there is an author match for given test authors
// testAuthors: are authors for a given center/institute for the given year to test if there is a match
// confirmedAuthors: is an optional parameter map of doi to a confirmed author if present and if so will make confidence highest
//
async function calculateConfidence (testAuthors, confirmedAuthors) {
  // get the set of tests to run
  const confidenceTypesByRank = await getConfidenceTypesByRank()
  // console.log(`Confidence Types By Rank: ${JSON.stringify(confidenceTypesByRank, null, 2)}`)

  const passedTests = []
  const failedTests = []
  const warningTests = []
  await pMap(testAuthors, async (testAuthor) => {
    console.log(`Confidence Test Author is: ${testAuthor['names'][0]['lastName']}, ${testAuthor['names'][0]['firstName']}`)
    const personPublications = await getPersonPublications(testAuthor['id'])
    await pMap(personPublications, async (personPublication) => {
      const publicationCsl = JSON.parse(personPublication['publication']['csl_string'])
      const passedConfidenceTests = await performAuthorConfidenceTests (testAuthor, publicationCsl, confirmedAuthors[personPublication['publication']['doi']], confidenceTypesByRank)
      // console.log(`Passed confidence tests: ${JSON.stringify(passedConfidenceTests, null, 2)}`)
      // returns a new map of rank -> confidenceTestName -> calculatedValue
      const passedConfidenceTestsWithConf = await calculateAuthorConfidence(passedConfidenceTests)
      // calculate overall total and write the confidence set and comments to the DB
      let confidenceTotal = 0.0
      _.mapValues(passedConfidenceTestsWithConf, (confidenceTests, rank) => {
        _.mapValues(confidenceTests, (confidenceTest) => {
          confidenceTotal += confidenceTest['confidenceValue']
          // console.log(`new total: ${confidenceTotal} for test: ${JSON.stringify(confidenceTest, null, 2)} new added val: ${confidenceTest['confidenceValue']}`)
        })
      })
      // set ceiling to 99%
      if (confidenceTotal >= 1.0) confidenceTotal = 0.99
      // have to do some weird conversion stuff to keep the decimals correct
      confidenceTotal = Number.parseFloat(confidenceTotal.toFixed(3))
      //update to current matched authors before proceeding with next tests
      let publicationAuthorMap = await getPublicationAuthorMap(publicationCsl)
      const newTest = {
        author: testAuthor,
        // confirmedAuthors: confirmedAuthors[personPublication['publication']['doi']],
        // pubAuthors: publicationAuthorMap[testAuthor['names'][0]['lastName']],
        confidenceItems: passedConfidenceTestsWithConf,
        persons_publications_id: personPublication['id'],
        doi: personPublication['publication']['doi'],
        prevConf: personPublication['confidence'],
        newConf: confidenceTotal
      };
      if (confidenceTotal === personPublication['confidence']) {
        passedTests.push(newTest)
      } else if (confidenceTotal > personPublication['confidence']) {
        warningTests.push(newTest)
      } else { 
        failedTests.push(newTest)
      }
      // console.log(`Confidence found for ${JSON.stringify(testAuthor, null, 2)}: ${confidenceTotal}`)
    }, {concurrency: 3})
  }, { concurrency: 3 })
  // console.log(`Failed Tests: ${JSON.stringify(failedTests, null, 2)}`)
  // console.log(`Confirmed authors: ${JSON.stringify(confirmedAuthors, null, 2)}`)
  const failedTestsByNewConf = _.groupBy(failedTests, (failedTest) => {
    return `${failedTest.prevConf} -> ${failedTest.newConf}`
  })
  const passedTestsByNewConf = _.groupBy(passedTests, (passedTest) => {
    return `${passedTest.prevConf} -> ${passedTest.newConf}`
  })
  const warningTestsByNewConf = _.groupBy(warningTests, (warningTest) => {
    return `${warningTest.prevConf} -> ${warningTest.newConf}`
  })
  _.each(_.keys(passedTestsByNewConf), (conf) => {
    console.log(`${passedTestsByNewConf[conf].length} Passed Tests By Confidence: ${conf}`)
  })
  _.each(_.keys(warningTestsByNewConf), (conf) => {
    console.log(`${warningTestsByNewConf[conf].length} Warning Tests By Confidence: ${conf}`)
  })
  _.each(_.keys(failedTestsByNewConf), (conf) => {
    // console.log(`${JSON.stringify(failedTestsByNewConf[conf], null, 2)} Failed Test By Confidence ${conf}`)
    console.log(`${failedTestsByNewConf[conf].length} Failed Tests By Confidence: ${conf}`)
  })
  console.log(`Passed tests: ${passedTests.length} Warning tests: ${warningTests.length} Failed Tests: ${failedTests.length}`)
  const confidenceTests = {
    passed: passedTests,
    warning: warningTests,
    failed: failedTests
  }
  return confidenceTests
}

// returns an array confidence set items that were inserted
async function insertConfidenceTestToDB (confidenceTest, confidenceAlgorithmVersion) {
  // create confidence set
  const confidenceSet = {
    persons_publications_id: confidenceTest['persons_publications_id'],
    value: confidenceTest['newConf'],
    version: confidenceAlgorithmVersion
  }
  //console.log(`Trying to write confidence set: ${JSON.stringify(confidenceSet, null, 2)}`)
  //insert confidence set
  const resultInsertConfidenceSet = await client.mutate(insertConfidenceSets([confidenceSet]))
  try {
    if (resultInsertConfidenceSet.data.insert_confidencesets.returning.length > 0) {
      const confidenceSetId = 0+parseInt(`${ resultInsertConfidenceSet.data.insert_confidencesets.returning[0].id }`)
      // console.log(`Added confidence set with id: ${ confidenceSetId }`)

      // insert confidence set items
      let confidenceSetItems = []
      let loopCounter = 0
      await pMap(_.keys(confidenceTest['confidenceItems']), async (rank) => {
        await randomWait(1000, loopCounter)
        loopCounter += 1
        _.each(confidenceTest['confidenceItems'][rank], (confidenceType) => {
          // console.log(`Trying to create confidenceset item objects for personPub: ${confidenceTest['persons_publications_id']} item: ${JSON.stringify(confidenceType, null, 2)}`)
          let obj = {}
          obj['confidenceset_id'] = confidenceSetId
          obj['confidence_type_id'] = confidenceType['confidenceTypeId']
          obj['value'] = confidenceType['confidenceValue']
          obj['comment'] = confidenceType['confidenceComment']
          // console.log(`Created insert confidence set item obj: ${JSON.stringify(obj, null, 2)}`)
          // push the object into the array of rows to insert later
          confidenceSetItems.push(obj)
        })
      }, {concurrency: 3})
      // console.log(JSON.stringify(confidenceSetItems, null, 2))
      // console.log(`Calling insert items ${confidenceSetId}`)
      const resultInsertConfidenceSetItems = await client.mutate(insertConfidenceSetItems(confidenceSetItems))
      // console.log(`Done insert items ${confidenceSetId}`)
      // _.each(resultInsertConfidenceSetItems.data.insert_confidencesets_items.returning, (item) => {
      //   console.log(`Added item for confidence set ${ confidenceSetId } with item id: ${ item.id }`)
      // })
      return resultInsertConfidenceSetItems.data.insert_confidencesets_items.returning
    } else {
      throw `Failed to insert confidence set no result returned for set: ${JSON.stringify(confidenceTest, null, 2)}`
    }
  } catch (error) {
     throw `Failed to insert confidence set: ${JSON.stringify(confidenceTest, null, 2)} with ${error}`
  }
}

async function main() {

  // use related github commit hash for the version when algorithm last completed
  const confidenceAlgorithmVersion = '876b7bd06e1ca819f5fe2f77ee48ea8c491f1ab1'
  // get confirmed author lists to papers
  const pathsByYear = {
    // 2019: ['../data/scopus.2019.20200320103319.csv']
    2019: ['../data/HCRI-pubs-2019_-_Faculty_Selected_2.csv'],
    2018: ['../data/HCRI-pubs-2018_-_Faculty_Selected_2.csv'],
    2017: ['../data/HCRI-pubs-2017_-_Faculty_Selected_2.csv']
  }

  // get the set of persons to test
  const testAuthors = await getAllSimplifiedPersons()
  //create map of last name to array of related persons with same last name
  const personMap = _.transform(testAuthors, function (result, value) {
    _.each(value.names, (name) => {
      (result[name['lastName']] || (result[name['lastName']] = [])).push(value)
    })
  }, {})

  let confirmedAuthors = new Map()
  let confirmedAuthorsByDoiByYear = new Map()
  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Loading ${year} Confirmed Authors`)
    //load data
    await pMap(pathsByYear[year], async (path) => {
      confirmedAuthorsByDoiByYear[year] = await getConfirmedAuthorsByDoiFromCSV(path)
    }, { concurrency: 1})
  }, { concurrency: 1 })

  // combine the confirmed author lists together
  //console.log(`combining confirmed author list: ${JSON.stringify(confirmedAuthorsByDoiByYear, null, 2)}`)
  let confirmedAuthorsByDoi = new Map()
  _.each(_.keys(confirmedAuthorsByDoiByYear), (year) => {
    _.each(_.keys(confirmedAuthorsByDoiByYear[year]), (doi) => {
      confirmedAuthorsByDoi[doi] = _.concat((confirmedAuthorsByDoi[doi] || []), _.values(confirmedAuthorsByDoiByYear[year][doi]))
    }) 
  })

  // console.log(`Confirmed Authors: ${JSON.stringify(confirmedAuthorsByDoi['10.1158/1541-7786.mcr-16-0312'], null, 2)}`)

  // first do against current values and then have updated based on what is found
  // run against all pubs in DB and confirm have same confidence value calculation
  // calculate confidence for publications
  const testAuthors2 = []
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===53}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===17}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===94}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===78}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===48}))
  // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===61}))
  testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===24}))
  // console.log(`Test authors: ${JSON.stringify(testAuthors2, null, 2)}`)
  const confidenceTests = await calculateConfidence (testAuthors, (confirmedAuthorsByDoi || {}))

  // next need to write checks found to DB and then calculate confidence accordingly
  let errorsInsert = []
  let passedInsert = []
  let totalConfidenceSets = 0
  let totalSetItems = 0
  let totalSetItemsInserted = 0
  console.log('Beginning insert of confidence sets...')
  await pMap (_.keys(confidenceTests), async (testStatus) => {
    // console.log(`trying to insert confidence values ${testStatus}`)
    let loopCounter = 1
    await pMap (confidenceTests[testStatus], async (confidenceTest) => {
      // console.log('trying to insert confidence values')
      randomWait(1000, loopCounter)
      loopCounter += 1
      try {
        // console.log(`Tabulating total for ${JSON.stringify(confidenceTest, null, 2)}`)
        totalConfidenceSets += 1
        _.each(_.keys(confidenceTest['confidenceItems']), (rank) => {
          _.each(_.keys(confidenceTest['confidenceItems'][rank]), (confidenceType) => {
            totalSetItems += 1
          })
        })
        const insertedConfidenceSetItems = await insertConfidenceTestToDB(confidenceTest, confidenceAlgorithmVersion)
        passedInsert.push(confidenceTest)
        totalSetItemsInserted += insertedConfidenceSetItems.length
      } catch (error) {
        errorsInsert.push(error)
        throw error
      }
    }, {concurrency: 1})
  }, {concurrency: 1})
  console.log('Done inserting confidence Sets...')
  console.log(`Errors on insert of confidence sets: ${JSON.stringify(errorsInsert, null, 2)}`)
  console.log(`Total Errors on insert of confidence sets: ${errorsInsert.length}`)
  console.log(`Total Sets Tried: ${totalConfidenceSets} Passed: ${passedInsert.length} Failed: ${errorsInsert.length}`)
  console.log(`Total Set Items Tried: ${totalSetItems} Passed: ${totalSetItemsInserted}`)
  console.log(`Passed tests: ${confidenceTests['passed'].length} Warning tests: ${confidenceTests['warning'].length} Failed Tests: ${confidenceTests['failed'].length}`)
}

main()