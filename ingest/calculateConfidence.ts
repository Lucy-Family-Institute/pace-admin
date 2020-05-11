import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'
import readConfidenceTypes from './gql/readConfidenceTypes'
import readPersonsByYear from '../client/src/gql/readPersonsByYear'
import readPersons from '../client/src/gql/readPersons'
import pMap from 'p-map'
import { command as loadCsv } from './units/loadCsv'
import Cite from 'citation-js'

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

function getAuthorLastNames (author) {
  const lastNames = _.transform(author['names'], function (result, value) {
    result.push(value['lastName'])
    return true
  }, [])
  return lastNames
}

async function testAuthorLastName (author, publicationAuthorMap) {
  //check for any matches of last name
  // get array of author last names
  const lastNames = getAuthorLastNames(author)
  // console.log(`here2 lastnames are: ${JSON.stringify(lastNames, null, 2)} `)
  const matchedAuthors = _.filter(publicationAuthorMap, (value, pubLastName) => {
    return _.hasIn(lastNames, pubLastName)
  })
  return matchedAuthors
}

async function testConfirmedAuthor (author, confirmedAuthorMap) {
  //check if author in confirmed list and change confidence to 0.99 if found
  //console.log(`Testing for confirmed authors: ${JSON.stringify(confirmedAuthorMap, null, 2)} against author: ${JSON.stringify(author, null, 2)}`)
  if (confirmedAuthorMap && confirmedAuthorMap.length > 0){
    _.each(author['names'], (name) => {
      _.each(_.values(confirmedAuthorMap[0]), function (confirmedAuthor){
         if (confirmedAuthor['lastName'].toLowerCase() === name.lastName.toLowerCase() &&
         confirmedAuthor['firstName'].toLowerCase() === name.firstName.toLowerCase()){
           console.log(`Confirmed author found: ${JSON.stringify(name,null,2)}, making confidence 0.99`)
           return true
         }
      })
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
async function performConfidenceTest (confidenceTypeName, publicationCsl, author, publicationAuthorMap, confirmedAuthors){
  if (confidenceTypeName === 'lastname') {
    return testAuthorLastName(author, publicationAuthorMap)
  } else if (confidenceTypeName === 'confirmed_by_author') {
     // needs to test against confirmed list
     return testConfirmedAuthor(author, confirmedAuthors)
  // } else if (confidenceTypeName === 'given_name_initial') {
  //   return testAuthorGivenNameInitial(author, publicationAuthorMap)
  // } else if (confidenceTypeName === 'given_name') {
  //   return testAuthorGivenName(author, publicationAuthorMap)
  // } else if (confidenceTypeName === 'university_affiliation') {
  //   return testAuthorAffiliation(author, publicationAuthorMap)
  // } else if (confidenceTypeName === 'common_coauthor') {
  //   // need the publication for this test
  //   // do nothing for now, and return an empty set
  //   return {}
  // } else if (confidenceTypeName === 'subject_area') {
  //   // do nothing for now and return an empty set
  //   return {}
  } else {
    return {}
  }
}

async function calculateConfidenceAuthor (author, publicationCsl, confirmedAuthors, confidenceTypesByRank) {
  let confidenceVal = 0.0
  // array of arrays for each rank sorted 1 to highest number
  // iterate through each group by rank if no matches in one rank, do no execute the next rank
  const sortedKeys = _.sortBy(_.keys(confidenceTypesByRank), (value) => { return value })
  // now just push arrays in order into another array

  //update to current matched authors before proceeding with next tests
  let publicationAuthorMap = getPublicationAuthorMap(publicationCsl)
  _.each(sortedKeys, (key) => {
    let matchFound = false
    _.each(confidenceTypesByRank[key], (confidenceType) => {
      // need to update to make publicationAuthorMap be only ones that matched last name for subsequent tests
      let matchedAuthors = performConfidenceTest(confidenceType.name, publicationCsl, author, publicationAuthorMap, confirmedAuthors)
      //console.log(`${confidenceType.name} Matched Authors Found: ${JSON.stringify(matchedAuthors, null, 2)}`)
      if (matchedAuthors && _.toLength(matchedAuthors) > 0){
        // log the confidence set to true in DB
        matchFound = true
        // calculate the confidence to add and add to overall value
        confidenceVal += 0.5
        //update to current matched authors before proceeding with next tests
        publicationAuthorMap = matchedAuthors
        console.log(`Test ${confidenceType.name} found matches: ${matchedAuthors}`)
      }
    })
    if (!matchFound){
      // stop processing and skip next set of tests
      return confidenceVal
    }
  })
  return confidenceVal
}

async function getAllSimplifiedPersons() {
  const queryResult = await client.query(readPersons())

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      names: [
        {
          lastName: person.family_name.toLowerCase(),
          firstInitial: person.given_name[0].toLowerCase(),
          firstName: person.given_name.toLowerCase(),
        }
      ],  // put in different lastname and given name combinations, for now just one variation
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

// Calculate the confidence of a match for each given test author and publication
//
// publication: publication to test if there is an author match for given test authors
// testAuthors: are authors for a given center/institute for the given year to test if there is a match
// confirmedAuthors: is an optional parameter map of doi to a confirmed author if present and if so will make confidence highest
//
async function calculateConfidence (publicationCsl, testAuthors, confirmedAuthors) {
  // get the set of tests to run
  const confidenceTypesByRank = await getConfidenceTypesByRank()
  console.log(`Confidence Types By Rank: ${JSON.stringify(confidenceTypesByRank, null, 2)}`)

  await pMap(testAuthors, async (testAuthor) => {
    const confidenceVal = calculateConfidenceAuthor (testAuthor, publicationCsl, confirmedAuthors, confidenceTypesByRank)
    // console.log(`Confidence found for ${JSON.stringify(testAuthor, null, 2)}: ${confidenceVal}`)
  }, { concurrency: 3 })

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
     
      console.log(`Confirmed Authors By Doi are: ${JSON.stringify(confirmedAuthorsByDoi,null,2)}`)
    }
    return confirmedAuthorsByDoi
  } catch (error){
    console.log(`Error on load confirmed authors: ${error}`)
    return {}
  }
}

async function main() {

  // get confirmed author lists to papers
  const pathsByYear = {
    // 2019: ['../data/scopus.2019.20200320103319.csv']
    2019: ['../data/HCRI-pubs-2019_-_Faculty_Selected_2.csv']//,
    //2018: ['../data/HCRI-pubs-2018_-_Faculty_Selected_2.csv'],
    //2017: ['../data/HCRI-pubs-2017_-_Faculty_Selected_2.csv']
  }

  // get the set of persons to test
  const testAuthors = await getAllSimplifiedPersons()
  //create map of last name to array of related persons with same last name
  const personMap = _.transform(testAuthors, function (result, value) {
    _.each(value.names, (name) => {
      (result[name.lastName] || (result[name.lastName] = [])).push(value)
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
  let confirmedAuthorsByDoi = new Map()
  _.each(_.keys(confirmedAuthorsByDoiByYear), (year) => {
    _.each(_.keys(confirmedAuthorsByDoiByYear[year]), (doi) => {
      confirmedAuthorsByDoi[doi] = _.concat((confirmedAuthorsByDoi[doi] || []), confirmedAuthorsByDoiByYear[year][doi])
    }) 
  })

  // calculate confidence for publications
  const doi = '10.1103/PhysRevC.99.024321'
  //get CSL (citation style language) record by doi from dx.dio.org
  const cslRecords = await Cite.inputAsync(doi)
  //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)

  const publicationCsl = cslRecords[0]
  calculateConfidence (publicationCsl, testAuthors, (confirmedAuthorsByDoi[doi] || {}))
}

main()