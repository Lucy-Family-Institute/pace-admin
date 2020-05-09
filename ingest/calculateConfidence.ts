import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'
import readConfidenceTypes from './gql/readConfidenceTypes'

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
                console.log(`Confirmed author found: ${JSON.stringify(testPerson,null,2)}, making confidence 0.99`)
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

async function calculateConfidenceByRank (personPublication, confidenceTypes) {

}

async function calculatePaperConfidence (personPublication, confidenceTypesByRank) {
  const confidenceValue = 0.0
  // const addConfidenceByRank = calculateConfidenceByRank (personPublication)
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
    const lastName = value.family.toLowerCase()
    return (result[lastName] || (result[lastName] = [])).push(value)
  }, {})
  return authorMap
}

async function testAuthorLastName (author, publicationAuthorMap) {
  //check for any matches of first initial or affiliation
  const authorLastName = author.lastName.toLowerCase()
  return _.hasIn(publicationAuthorMap, authorLastName)
}

async function testConfirmedAuthor (author, publication) {
  //check if author in confirmed list and change confidence to 0.99 if found
  if (publication.confirmedAuthorMap && publication.confirmedAuthorMap.length > 0){
    const authorLastName = author.lastName.toLowerCase()
    _.each(publication.confirmedAuthorMap[authorLastName], function (confirmedAuthor){
      if (confirmedAuthor.lastName.toLowerCase() === author.lastName.toLowerCase() &&
      confirmedAuthor.firstName.toLowerCase() === author.firstName.toLowerCase()){
        console.log(`Confirmed author found: ${JSON.stringify(author,null,2)}, making confidence 0.99`)
        return true
      }
    })
  }
  return false
}

// only call this method if last name matched
async function testAuthorGivenNameInitial (author, publicationAuthorMap) {
  //check for any matches of first initial or affiliation
  const authorLastName = author.lastName.toLowerCase()
  _.each(publicationAuthorMap[authorLastName], async (testPerson) => {
    if (testPerson.given.toLowerCase()[0] === author.firstInitial.toLowerCase()){
      return true
    }
  })
  return false
}

// only call this method if last name matched
async function testAuthorGivenName (author, publicationAuthorMap) {
  //check for any matches of first initial or affiliation
  const authorLastName = author.lastName.toLowerCase()
  _.each(publicationAuthorMap[authorLastName], async (testPerson) => {
    if (testPerson.given.toLowerCase() === author.firstName.toLowerCase()){
      return true
    }
  })
  return false
}

// assumes passing in authors that matched previously
async function testAuthorAffiliation (author, publicationAuthorMap) {
  const authorLastName = author.lastName.toLowerCase()
  _.each(publicationAuthorMap[authorLastName], async (testPerson) => {
    if(!_.isEmpty(testPerson.affiliation)) {
      if(/notre dame/gi.test(testPerson.affiliation[0].name)) {
        return true
      }
    }
  })
  return false
}

// returns true/false from a test called for the specific name passed in
async function performConfidenceTest (confidenceTypeName, publication, author, publicationAuthorMap){
  if (confidenceTypeName === 'lastname') {
    return testAuthorLastName(author, publicationAuthorMap)
  } else if (confidenceTypeName === 'confirmed_by_author') {
    // needs to test against confirmed list
    return testConfirmedAuthor(author, publication)
  } else if (confidenceTypeName === 'given_name_initial') {
    return testAuthorGivenNameInitial(author, publicationAuthorMap)
  } else if (confidenceTypeName === 'given_name') {
    return testAuthorGivenName(author, publicationAuthorMap)
  } else if (confidenceTypeName === 'university_affiliation') {
    return testAuthorAffiliation(author, publicationAuthorMap)
  } else if (confidenceTypeName === 'common_coauthor') {
    // need the publication for this test
    // do nothing for now
    return false
  } else if (confidenceTypeName === 'subject_area') {
    // do nothing for now
    return false
  }
}

async function calculateConfidenceAuthor (author, publication, confirmedAuthors, confidenceTypesByRank) {
  const confidenceVal = 0.0
  // array of arrays for each rank sorted 1 to highest number
  // iterate through each group by rank if no matches in one rank, do no execute the next rank
  const sortedKeys = _.sortBy(_.keys(confidenceTypesByRank), (value) => { return value })
  // now just push arrays in order into another array

  //update to current matched authors before proceeding with next tests
  const publicationAuthorMap = getCSLAuthors(publication.csl)
  _.each(sortedKeys, (key) => {
    let matchFound = false
    _.each(confidenceTypesByRank[key], (confidenceType) => {
      // need to update to make publicationAuthorMap be only ones that matched last name for subsequent tests
      const testConfidence = performConfidenceTest(confidenceType.name, publication, author, publicationAuthorMap)
      if (testConfidence){
        // log the confidence set to true in DB
        matchFound = true
        // calculate the confidence to add and add to overall value
      }
    })
    if (!matchFound){
      // stop processing and skip next set of tests
      return confidenceVal
    }
  })
}

async function calculateConfidence (personMap, authors, confirmedAuthors) {
  // get the set of tests to run
  const confidenceTypesByRank = await getConfidenceTypesByRank()
  console.log(`Confidence Types By Rank: ${JSON.stringify(confidenceTypesByRank, null, 2)}`)

  const confidenceMetricsByRank = {
    1:  {
      base: 0.3,
      additiveCoefficient: 0.5
    },
    2: {
      base: 0.2,
      additiveCoefficient: 0.5,
    },
    3: {
      base: 0.15,
      additiveCoefficient: 0.6
    }
  }
  // array of arrays for each rank sorted 1 to highest number
  // iterate through each group by rank if no matches in one rank, do no execute the next rank
  const sortedKeys = _.sortBy(_.keys(confidenceTypesByRank), (value) => { return value })
  // now just push arrays in order into another array

  //update to current matched authors before proceeding with next tests

}

async function main() {

  
}

main()