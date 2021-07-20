import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import humanparser from 'humanparser'
import readConfidenceTypes from '../gql/readConfidenceTypes'
import readPersons from '../../client/src/gql/readPersons'
import readLastPersonPubConfidenceSet from '../gql/readLastPersonPubConfidenceSet'
import readPersonPublications from '../gql/readPersonPublications'
import readPersonPublication from '../gql/readPersonPublication'
import readNewPersonPublications from '../gql/readNewPersonPublications'
import readNewPersonPublicationsCount from '../gql/readNewPersonPublicationsCount'
import readPersonPublicationsCountByYear from '../gql/readPersonPublicationsCountByYear'
import readPersonPublicationsRange from '../gql/readPersonPublicationsRange'
import insertConfidenceSets from '../gql/insertConfidenceSets'
import insertConfidenceSetItems from '../gql/insertConfidenceSetItems'
import pMap from 'p-map'
import pTimes from 'p-times'
import { command as loadCsv } from '../units/loadCsv'
import { randomWait } from '../units/randomWait'
const Fuse = require('fuse.js')
import dotenv from 'dotenv'
import readAllNewPersonPublications from '../gql/readAllNewPersonPublications'
import insertReview from '../../client/src/gql/insertReview'
import readPersonPublicationsByDoi from '../gql/readPersonPublicationsByDoi'

const getIngestFilePaths = require('../getIngestFilePaths');
import readPersonPublicationsByYear from '../gql/readPersonPublicationsByYear'
import { normalizeString, normalizeObjectProperties } from '../units/normalizer'
import { command as writeCsv } from '../units/writeCsv'
import moment from 'moment'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
  },
})
interface MatchedPerson {
  person: any; // TODO: What is this creature?
  confidence: number;
}
export class CalculateConfidence {

  constructor () {
  }

  // get the confidence set from the last run to know where to start calculating new confidence sets
  async getLastPersonPubConfidenceSet () {
    const queryResult = await client.query(readLastPersonPubConfidenceSet())
    const confidenceSets = queryResult.data.confidencesets
    if (confidenceSets.length > 0) {
      return confidenceSets[0]
    } else {
      return null
    }
  }

  async getPersonPublication(personPubId) {
    const queryResult = await client.query(readPersonPublication(personPubId))
    return (queryResult.data.persons_publications.length > 0 ? queryResult.data.persons_publications[0] : undefined)
  }

  async getPersonPublicationsCount (personId, startPersonPubId, minConfidence=0.0, publicationYear?) {
    if (publicationYear) {
      const queryResult = await client.query(readPersonPublicationsCountByYear(personId, publicationYear))
      return queryResult.data.persons_publications_aggregate.aggregate.count
    } else {
      const queryResult = await client.query(readNewPersonPublicationsCount(personId, startPersonPubId, minConfidence))
      return queryResult.data.persons_publications_aggregate.aggregate.count
    }
  }

  async getPersonPublications (personId, startPersonPubId, minConfidence, publicationYear?) {
    console.log(`Getting Person Publications for person id: ${personId}`)
    if (publicationYear) {
      console.log(`Querying for person id: '${personId}' publications by year ${publicationYear}`)
      const queryResult = await client.query(readPersonPublicationsByYear(personId, publicationYear))
      console.log(`Done querying for person id: '${personId}' publications by year ${publicationYear}`)
      return queryResult.data.persons_publications 
    } else if (startPersonPubId===undefined) {
      console.log(`Querying for person id: '${personId}' all publications`)
      const queryResult = await client.query(readPersonPublications(personId))
      console.log(`Done querying for person id: '${personId}' all publications`)
      return queryResult.data.persons_publications
    } else {
      console.log(`Querying for person id: '${personId}' all recent publications`)
      const queryResult = await client.query(readNewPersonPublications(personId, startPersonPubId, minConfidence))
      console.log(`Done querying for person id: '${personId}' all recent publications`)
      return queryResult.data.persons_publications
    }
  }

  async getDoiPersonPublications (doi, personId) {
    const queryResult = await client.query(readPersonPublicationsByDoi(doi, personId))
    return queryResult.data.persons_publications_metadata
  }

  async getAllSimplifiedPersons () {
    const queryResult = await client.query(readPersons())

    const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
      const names = []
      names.push({
        lastName: person.family_name.toLowerCase(),
        firstInitial: person.given_name[0].toLowerCase(),
        firstName: person.given_name.toLowerCase(),
      })
      // add all name variations
      if (person.persons_namevariances) {
        _.each (person.persons_namevariances, (nameVariance) => {
          names.push({
            lastName: nameVariance.family_name.toLowerCase(),
            firstInitial: (nameVariance.given_name ? nameVariance.given_name[0].toLowerCase() : ''),
            firstName: (nameVariance.given_name ? nameVariance.given_name.toLowerCase() : '')
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

  async getPapersByDoi (csvPath) {
    console.log(`Loading Papers from path: ${csvPath}`)
    // ingest list of DOI's from CSV and relevant center author name
    try {
      const authorPapers: any = await loadCsv({
      path: csvPath
      })

      //normalize column names to all lowercase
      const authorLowerPapers = _.mapValues(authorPapers, function (paper) {
        return _.mapKeys(paper, function (value, key) {
          return key.toLowerCase()
        })
      })

      // console.log(`After lowercase ${_.keys(authorLowerPapers[0])}`)

      const papersByDoi = _.groupBy(authorLowerPapers, function(paper) {
        //strip off 'doi:' if present
        return _.replace(paper['doi'], 'doi:', '')
      })
      return papersByDoi
    } catch (error){
      console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
      return undefined
    }
  }

  async getConfirmedAuthorsByDoi (papersByDoi, csvColumn) {
    const confirmedAuthorsByDoi = _.mapValues(papersByDoi, function (papers) {
      return _.mapValues(papers, function (paper) {
        const unparsedName = paper[csvColumn]
        const parsedName =  humanparser.parseName(unparsedName)
        return parsedName
      })
    })
    return confirmedAuthorsByDoi
  }

  async getConfirmedAuthorsByDoiFromCSV (path) {
    try {
      const papersByDoi = await this.getPapersByDoi(path)
      const dois = _.keys(papersByDoi)
      console.log(`Papers by DOI Count: ${JSON.stringify(dois.length,null,2)}`)

      const confirmedAuthorColumn = 'nd author (last, first)'
      const firstDoiConfirmedList = papersByDoi[dois[0]]

      //check if confirmed column exists first, if not ignore this step
      let confirmedAuthorsByDoi = {}
      if (papersByDoi && dois.length > 0 && firstDoiConfirmedList && firstDoiConfirmedList.length > 0 && firstDoiConfirmedList[0][confirmedAuthorColumn]){
        //get map of DOI's to an array of confirmed authors from the load table
        confirmedAuthorsByDoi = await this.getConfirmedAuthorsByDoi(papersByDoi, confirmedAuthorColumn)

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
  async matchPeopleToPaperAuthors(publicationCSL, simplifiedPersons, personMap, authors, confirmedAuthors, sourceName) : Promise<Map<number,MatchedPerson>> {

    //match to last name
    //match to first initial (increase confidence)
    let matchedPersonMap = new Map()

    const confidenceTypesByRank = await this.getConfidenceTypesByRank()
    await pMap(simplifiedPersons, async (person) => {
      
      //console.log(`Testing Author for match: ${author.family}, ${author.given}`)

        const passedConfidenceTests = await this.performAuthorConfidenceTests (person, publicationCSL, confirmedAuthors, confidenceTypesByRank, sourceName)
        // console.log(`Passed confidence tests: ${JSON.stringify(passedConfidenceTests, null, 2)}`)
        // returns a new map of rank -> confidenceTestName -> calculatedValue
        const passedConfidenceTestsWithConf = await this.calculateAuthorConfidence(passedConfidenceTests)
        // calculate overall total and write the confidence set and comments to the DB
        let confidenceTotal = 0.0
        _.mapValues(passedConfidenceTestsWithConf, (confidenceTests, rank) => {
          _.mapValues(confidenceTests, (confidenceTest) => {
            confidenceTotal += confidenceTest['confidenceValue']
          })
        })
        // set ceiling to 99%
        if (confidenceTotal >= 1.0) confidenceTotal = 0.99
        // have to do some weird conversion stuff to keep the decimals correct
        confidenceTotal = Number.parseFloat(confidenceTotal.toFixed(3))
        // console.log(`passed confidence tests are: ${JSON.stringify(passedConfidenceTestsWithConf, null, 2)}`)
        //check if persons last name in author list, if so mark a match
            //add person to map with confidence value > 0
          if (confidenceTotal > 0) {
            // console.log(`Match found for Author: ${author.family}, ${author.given}`)
            let matchedPerson: MatchedPerson = { 'person': person, 'confidence': confidenceTotal }
            matchedPersonMap[person['id']] = matchedPerson
            //console.log(`After add matched persons map is: ${JSON.stringify(matchedPersonMap,null,2)}`)
          }
    }, { concurrency: 1 })

    //console.log(`After tests matchedPersonMap is: ${JSON.stringify(matchedPersonMap,null,2)}`)
    return matchedPersonMap
  }

  async getConfidenceTypesByRank() {
    const queryResult = await client.query(readConfidenceTypes())
    const confidenceTypesByRank = _.groupBy(queryResult.data.confidence_type, (confidenceType) => {
      return confidenceType.rank
    })
    return confidenceTypesByRank
  }

  getCSLAuthors(paperCsl){

    const authMap = {
      firstAuthors : [],
      otherAuthors : []
    }

    let authorCount = 0
    _.each(paperCsl.author, async (author) => {
      // skip if family_name undefined
      if (author.family != undefined){
        authorCount += 1

        //if given name empty change to empty string instead of null, so that insert completes
        if (author.given === undefined) author.given = ''

        if (_.lowerCase(author.sequence) === 'first' ) {
          authMap.firstAuthors.push(author)
        } else {
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

    return authors
  }

  getPublicationAuthorMap (publicationCsl) {
    //retrieve the authors from the record and put in a map, returned above in array, but really just one element
    const authors = this.getCSLAuthors(publicationCsl)
    // group authors by last name
    //create map of last name to array of related persons with same last name
    const authorMap = _.transform(authors, function (result, value) {
      const lastName = _.toLower(value.family)
      return (result[lastName] || (result[lastName] = [])).push(value)
    }, {})
    return authorMap
  }

  getAuthorLastNames (author) {
    const lastNames = _.transform(author['names'], function (result, value) {
      result.push(value['lastName'])
      return true
    }, [])
    return lastNames
  }

  lastNameMatchFuzzy (last, lastKey, nameMap){
    // first normalize the diacritics
    const testNameMap = _.map(nameMap, (name) => {
      let norm = normalizeObjectProperties(name, [lastKey], { removeSpaces: true })
      return norm
    })
    // normalize last name checking against as well
    let testLast = normalizeString(last, { removeSpaces: true })
    const lastFuzzy = new Fuse(testNameMap, {
      caseSensitive: false,
      shouldSort: true,
      includeScore: false,
      keys: [lastKey],
      findAllMatches: true,
      threshold: 0.100,
    });

    const lastNameResults = lastFuzzy.search(testLast)
    return lastNameResults.length > 0 ? lastNameResults[0] : null
  }

  nameMatchFuzzy (searchLast, lastKey, searchFirst, firstKey, nameMap) {
    // first normalize the diacritics
    // and if any spaces in search string replace spaces in both fields and search map with underscores for spaces
    const testNameMap = _.map(nameMap, (name) => {
      let norm = normalizeObjectProperties(name, [lastKey, firstKey], { removeSpaces: true })
      return norm
    })
    // normalize name checking against as well
    let testLast = normalizeString(searchLast, { removeSpaces: true } )
    let testFirst = normalizeString(searchFirst, { removeSpaces: true })

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
    // need to reduce down to arrays of "item" value to then pass again to Fuse
    const reducedLastNameResults = _.map(lastNameResults, (result) => {
      return result['item'] ? result['item'] : result
    })
    const fuzzyFirst = new Fuse(reducedLastNameResults, {
      caseSensitive: false,
      shouldSort: true,
      includeScore: false,
      keys: [firstKey],
      findAllMatches: true,
      threshold: 0.100,
    });
    const results = fuzzyFirst.search(testFirst);
    return results.length > 0 ? results[0] : null;
  }

  testAuthorLastName (author, publicationAuthorMap) {
    // console.log(`Testing pub w author: ${JSON.stringify(author, null, 2)}`)
    //check for any matches of last name
    // get array of author last names
    const lastNames = this.getAuthorLastNames(author)
    // console.log(`Publication author map is: ${JSON.stringify(publicationAuthorMap, null, 2)}`)
    // console.log(`last names are: ${JSON.stringify(lastNames, null, 2)}`)
    let matchedAuthors = {}
    _.each(_.keys(publicationAuthorMap), (pubLastName) => {
      _.each(lastNames, (lastName) => {
        if (this.lastNameMatchFuzzy(lastName, 'family', publicationAuthorMap[pubLastName])) {
          matchedAuthors[pubLastName] = publicationAuthorMap[pubLastName]
          return false
        }
      })
    })
    return matchedAuthors
  }

  testConfirmedAuthor (author, publicationAuthorMap, confirmedAuthorMap) {
    //check if author in confirmed list and change confidence to 0.99 if found
    let matchedAuthors = new Map()
    if (confirmedAuthorMap && confirmedAuthorMap.length > 0){
      _.each(author['names'], (name) => {
        if (this.nameMatchFuzzy(name.lastName, 'lastName', name['firstName'].toLowerCase(), 'firstName', confirmedAuthorMap)) {
          // find pub authors with fuzzy match to confirmed author
          _.each(_.keys(publicationAuthorMap), (pubLastName) => {
            // find the relevant pub authors and return as matched
            // no guarantee the pub author name matches the last name for the confirmed name
            // so need to find a last name variant that does match
            if (this.lastNameMatchFuzzy(pubLastName, 'lastName', author.names)) {
              matchedAuthors[pubLastName] = publicationAuthorMap[pubLastName]
            }
          })
        } else {
        }
      })
    }
    return matchedAuthors
  }

  // only call this method if last name matched
  testAuthorGivenNamePart (author, publicationAuthorMap, initialOnly, failIfOnlyInitialInGivenName?) {
    // really check for last name and given name intial match for one of the name variations
    // group name variations by last name
    const nameVariations = _.groupBy(author['names'], 'lastName')
    let matchedAuthors = new Map()
    _.each(_.keys(nameVariations), (nameLastName) => {
      _.each(_.keys(publicationAuthorMap), (pubLastName) => {
        // check for a fuzzy match of name variant last names to lastname in pub author list
        if (this.lastNameMatchFuzzy(pubLastName, 'lastName', nameVariations[nameLastName]) || this.lastNameMatchFuzzy(pubLastName, 'family', nameVariations[nameLastName])){
          // console.log(`Found lastname match pub: ${pubLastName} and variation: ${nameLastName}`)
          // now check for first initial or given name match
          // split the given name based on spaces

          _.each(publicationAuthorMap[pubLastName], (pubAuthor) => {
            // split given names into separate parts and check initial against each one
            let matched = false
            const givenParts = _.split(pubAuthor['given'], ' ')
            let firstKey = 'firstName'
            _.each(givenParts, (part) => {
              if (initialOnly){
                part = part[0]
                firstKey = 'firstInitial'
              }
              if (part===undefined){
                console.log(`splitting given parts pubAuthor is: ${JSON.stringify(pubAuthor, null, 2)}`)
              }
              if (part && this.nameMatchFuzzy(pubLastName, 'lastName', part.toLowerCase(), firstKey, nameVariations[nameLastName])) {
                // console.log(`found match for author: ${JSON.stringify(pubAuthor, null, 2)}`)
                const testPart = part.replace(/\./g,'')
                // console.log(`part is '${part}' Test part is: '${testPart}' failIfOnlyInitialInGivenName is: ${failIfOnlyInitialInGivenName}`)
                if (!failIfOnlyInitialInGivenName || testPart.length > 1){
                  (matchedAuthors[pubLastName] || (matchedAuthors[pubLastName] = [])).push(pubAuthor)
                  matched = true
                }
              }
            })
            // if not matched try matching without breaking it into parts
            if (!matched && givenParts.length > 1) {
              if (this.nameMatchFuzzy(pubLastName, 'lastName', pubAuthor['given'], firstKey, nameVariations[nameLastName])) {
                const testPart = pubAuthor['given'].replace(/\./g,'')
                // only set to true if not failing for 1 character names (i.e., initial)
                if (!failIfOnlyInitialInGivenName || testPart.length > 1){
                  (matchedAuthors[pubLastName] || (matchedAuthors[pubLastName] = [])).push(pubAuthor)
                }
              }
            }
          })
        }
      })
    })
    return matchedAuthors
  }

  // only call this method if last name matched
  testAuthorGivenNameInitial (author, publicationAuthorMap) {
    return this.testAuthorGivenNamePart(author, publicationAuthorMap, true)
  }

  // only call this method if last name and initials matched
  testAuthorGivenName (author, publicationAuthorMap, failIfOnlyInitialInGivenName?) {
    return this.testAuthorGivenNamePart(author, publicationAuthorMap, false, failIfOnlyInitialInGivenName)
  }

  // only call this method if last name and initials matched
  testAuthorGivenNameMismatch (author, publicationAuthorMap) {
    // check if initials passed, if initials do not pass then say it is a mismatch
    //  -- if initials passed then check given name. 
    //  -- if given name length 1 char only or moret than not a match say there is a mismatch
    
    const testInitialsMatchedAuthors = this.testAuthorGivenNameInitial (author, publicationAuthorMap)
    const testInitialsMatch = (testInitialsMatchedAuthors && _.keys(testInitialsMatchedAuthors).length > 0)
    if (testInitialsMatch) {
      // check if passes with failIfOnlyInitialInGivenName to false so it allows matches if length = 1
      const testInitialsAllowedMatchedAuthors = this.testAuthorGivenNamePart (author, publicationAuthorMap, false, false)
      const testInitialsAllowed = (testInitialsAllowedMatchedAuthors && _.keys(testInitialsAllowedMatchedAuthors).length > 0)
      // const testInitialsNotAllowed = (testInitialsNotAllowedMatchedAuthors && _.keys(testInitialsNotAllowedMatchedAuthors).length > 0)
      if (testInitialsAllowed) {
        // console.log(`No given Name mismatch both with initials and without`)
        return {}
      } else {
        console.log(`Given Name mismatch detected initials match, but not other match test author: ${JSON.stringify(author, null, 2)} pub authors: ${JSON.stringify(publicationAuthorMap, null, 2)}`)
        return testInitialsMatchedAuthors
      }
    } else {
      // console.log(`Given Name mismatch no initials match, so just returning empty set to ignore this test as only applies when initial match found`)
      return {}
    }
  }

  getAuthorsFromSourceMetadata(sourceName, sourceMetadata) {
    if (_.toLower(sourceName)==='pubmed'){
      return _.mapValues(sourceMetadata['creators'], (creator) => {
        return {
          initials: creator['initials'],
          lastName: creator['familyName'],
          firstName: creator['givenName'],
          affiliation: [{
            name: creator['affiliation']
          }]
        }
      })
    } else {
      return undefined
    }
  }

// assumes passing in authors that matched previously
testAuthorAffiliation (author, publicationAuthorMap, sourceName, sourceMetadata) {
  const nameVariations = _.groupBy(author['names'], 'lastName')
  let matchedAuthors = new Map()
  _.each(_.keys(nameVariations), (nameLastName) => {
    _.each(_.keys(publicationAuthorMap), (pubLastName) => {
      // check for a fuzzy match of name variant last names to lastname in pub author list
      if (this.lastNameMatchFuzzy(pubLastName, 'lastName', nameVariations[nameLastName])){
        _.each(publicationAuthorMap[pubLastName], async (pubAuthor) => {
          if(!_.isEmpty(pubAuthor['affiliation'])) {
            if(/notre dame/gi.test(pubAuthor['affiliation'][0].name)) {
              (matchedAuthors[nameLastName] || (matchedAuthors[nameLastName] = [])).push(pubAuthor)
            }
          }
        })
      }
    })
    // check source metadata as well
    _.each(this.getAuthorsFromSourceMetadata(sourceName, sourceMetadata), (author) => {
      const pubLastName = author.lastName
      // console.log(`Checking affiliation of author: ${JSON.stringify(author, null, 2)}`)
      // check for a fuzzy match of name variant last names to lastname in pub author list
      if (pubLastName && this.lastNameMatchFuzzy(pubLastName, 'lastName', nameVariations[nameLastName])){
        // console.log(`Checking affiliation of author: ${JSON.stringify(author, null, 2)}, found author match: ${pubLastName}`)
        if(!_.isEmpty(author['affiliation'])) {
          // console.log(`Checking affiliation of author: ${JSON.stringify(author, null, 2)}, found affiliation value for author: ${pubLastName} affiliation: ${author['affiliation']}`)
          // if(/notre dame/gi.test(author['affiliation'][0].name)) {
          //   console.log(`Checking affiliation of author: ${JSON.stringify(author, null, 2)}, found affiliation match for author: ${pubLastName}`)
          // }
          if(/notre dame/gi.test(author['affiliation'][0].name)) {
            (matchedAuthors[nameLastName] || (matchedAuthors[nameLastName] = [])).push(author)
          }
        }
      }
    })
  })
  return matchedAuthors
}

  // returns true/false from a test called for the specific name passed in
  performConfidenceTest (confidenceType, publicationCsl, author, publicationAuthorMap, confirmedAuthors, sourceName, sourceMetadata?){
    if (confidenceType.name === 'lastname') {
      return this.testAuthorLastName(author, publicationAuthorMap)
    } else if (confidenceType.name === 'confirmed_by_author') {
      // needs to test against confirmed list
      const matchedAuthors = this.testConfirmedAuthor(author, publicationAuthorMap, confirmedAuthors)
      // console.log(`Matches authors for ${confidenceTypeName}: ${JSON.stringify(matchedAuthors, null, 2)}`)
      return matchedAuthors
    } else if (confidenceType.name === 'given_name_initial') {
      return this.testAuthorGivenNameInitial(author, publicationAuthorMap)
    } else if (confidenceType.name === 'given_name_mismatch') {
      // this one opposite other tests where a set is returned if mismatches are found, setting it true
      // console.log('Checking if given name mismatch...')
      return this.testAuthorGivenNameMismatch(author, publicationAuthorMap)
    } else if (confidenceType.name === 'given_name') {
      return this.testAuthorGivenName(author, publicationAuthorMap, true)
    } else if (confidenceType.name === 'university_affiliation') {
      return this.testAuthorAffiliation(author, publicationAuthorMap, sourceName, sourceMetadata)
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

  async performAuthorConfidenceTests (author, publicationCsl, confirmedAuthors, confidenceTypesByRank, sourceName, sourceMetadata?, pubAuthorMap?) {
    // array of arrays for each rank sorted 1 to highest number
    // iterate through each group by rank if no matches in one rank, do no execute the next rank
    const sortedRanks = _.sortBy(_.keys(confidenceTypesByRank), (value) => { return value })
    // now just push arrays in order into another array

    //update to current matched authors before proceeding with next tests
    let publicationAuthorMap
    if (pubAuthorMap) {
      publicationAuthorMap = pubAuthorMap
    } else {
      publicationAuthorMap = this.getPublicationAuthorMap(publicationCsl)
    }
    // initialize map to store passed tests by rank
    let passedConfidenceTests = {}
    let stopTesting = false
    await pMap (sortedRanks, async (rank) => {
      let matchFound = false
      // after each test need to union the set of authors matched before moving to next level
      let matchedAuthors = {}
      if (!stopTesting){
        await pMap(confidenceTypesByRank[rank], async (confidenceType) => {
          // need to update to make publicationAuthorMap be only ones that matched last name for subsequent tests
          let currentMatchedAuthors = this.performConfidenceTest(confidenceType, publicationCsl, author, publicationAuthorMap, confirmedAuthors, sourceName, sourceMetadata)
          if (currentMatchedAuthors && _.keys(currentMatchedAuthors).length > 0){
            (passedConfidenceTests[rank] || (passedConfidenceTests[rank] = {}))[confidenceType['name']] = {
              confidenceTypeId: confidenceType['id'],
              confidenceTypeName : confidenceType['name'],
              confidenceTypeBaseValue: confidenceType['base_value'],
              testAuthor : author,
              matchedAuthors : currentMatchedAuthors
            }
            // union any authors that are there for each author last name
            _.each(_.keys(currentMatchedAuthors), (matchedLastName) => {
              if (matchedAuthors[matchedLastName]) {
                // need to merge with existing list
                matchedAuthors[matchedLastName] = _.unionWith(matchedAuthors[matchedLastName], currentMatchedAuthors[matchedLastName], _.isEqual)
              } else {
                matchedAuthors[matchedLastName] = currentMatchedAuthors[matchedLastName]
              }
            })
            if (confidenceType['stop_testing_if_passed']){
              stopTesting = true
            }
          }
        }, {concurrency: 3})
        if (_.keys(matchedAuthors).length <= 0 || stopTesting){
          // stop processing and skip next set of tests
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

  private confidenceMetrics = {
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
    given_name_mismatch: {
      // in this case lower confidence if given name not a match but initial was a match
      base: -0.10,
      additiveCoefficient: 1.0
    },
    given_name_initial: {
      base: 0.20,
      additiveCoefficient: 1.0
    },
    confirmed_by_author: {
      base: 0.99,
      additiveCoefficient: 1.0
    }
  }

  getConfidenceValue (rank, confidenceTypeName, index, confidenceTypeBaseValue?) {
    // start by setting metric to default rank metric
    let confidenceMetric = this.confidenceMetrics[rank]
    if (this.confidenceMetrics[confidenceTypeName]) {
      // specific metric found for test type and use that instead of default rank value
      confidenceMetric = this.confidenceMetrics[confidenceTypeName]
    }
    // const baseValue = (confidenceTypeBaseValue ? confidenceTypeBaseValue : confidenceMetric.base)
    const baseValue = confidenceMetric.base
    if (index > 0) {
      // if not first one multiply by the additive coefficient
      return baseValue * confidenceMetric.additiveCoefficient
    } else {
      return baseValue
    }
  }

  //returns a new map of rank -> test name -> with property calculatedValue and comment added
  async calculateAuthorConfidence (passedConfidenceTests) {
    // calculate the confidence for each where first uses full value and each add'l uses
    // partial increment to increase confidence slightly for this category of tests
    let newPassedConfidenceTests = {}
    _.each(_.keys(passedConfidenceTests), async (rank) => {
      let index = 0
      let newConfidenceTests = {}
      _.each(passedConfidenceTests[rank], (confidenceTest) => {
        newConfidenceTests[confidenceTest.confidenceTypeName] = _.clone(confidenceTest)
        _.set(newConfidenceTests[confidenceTest.confidenceTypeName], 'confidenceValue', this.getConfidenceValue(rank, confidenceTest.confidenceTypeName, index, confidenceTest.confidenceTypeBaseValue))
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
  async calculateConfidence (mostRecentPersonPubId, testAuthors, confirmedAuthors, publicationYear?) {
    // get the set of tests to run
    const confidenceTypesByRank = await this.getConfidenceTypesByRank()

    const passedTests = []
    const failedTests = []
    const warningTests = []

    console.log('Entering loop 1...')

    const minConfidence = 0.45

    await pMap(testAuthors, async (testAuthor) => {
      console.log(`Confidence Test Author is: ${testAuthor['names'][0]['lastName']}, ${testAuthor['names'][0]['firstName']}`)
      // if most recent person pub id is defined, it will not recalculate past confidence sets
      const personPubCount = await this.getPersonPublicationsCount(testAuthor['id'], mostRecentPersonPubId, minConfidence, publicationYear)
      console.log(`Found '${personPubCount}' new possible pub matches for Test Author: ${testAuthor['names'][0]['lastName']}, ${testAuthor['names'][0]['firstName']}`)

      const resultLimit = 1000
      let numberOfRequests = 1
      if (personPubCount > resultLimit){
        numberOfRequests += parseInt(`${personPubCount / resultLimit}`) //convert to an integer to drop any decimal
      }
      const thisConf = this
      await pTimes (numberOfRequests, async function (index) {
        console.log(`Performing request (${(index+1)} of ${numberOfRequests}) for Test Author: ${testAuthor['names'][0]['lastName']}, ${testAuthor['names'][0]['firstName']}`)
        const personPublications = await thisConf.getPersonPublications(testAuthor['id'], mostRecentPersonPubId, minConfidence, publicationYear)
        console.log(`Entering loop 2 Test Author: ${testAuthor['names'][0]['lastName']}`)
        await pMap(personPublications, async (personPublication) => {
          // need to load csl one by one since query fails otherwise
          const currentPersonPublication = await thisConf.getPersonPublication(personPublication['id'])
          const publicationCsl = JSON.parse(currentPersonPublication['publication']['csl_string'])
          const sourceMetadata = currentPersonPublication['publication']['source_metadata']
          const sourceName = currentPersonPublication['publication']['source_name']
          // console.log(`Source metadata is: ${JSON.stringify(sourceMetadata, null, 2)}`)
          const passedConfidenceTests = await thisConf.performAuthorConfidenceTests (testAuthor, publicationCsl, confirmedAuthors[personPublication['publication']['doi']], confidenceTypesByRank, sourceName, sourceMetadata)

          // returns a new map of rank -> confidenceTestName -> calculatedValue
          const passedConfidenceTestsWithConf = await thisConf.calculateAuthorConfidence(passedConfidenceTests)
          // calculate overall total and write the confidence set and comments to the DB
          let confidenceTotal = 0.0
          _.mapValues(passedConfidenceTestsWithConf, (confidenceTests, rank) => {
            _.mapValues(confidenceTests, (confidenceTest) => {
              confidenceTotal += confidenceTest['confidenceValue']
            })
          })
          // set ceiling to 99%
          if (confidenceTotal >= 1.0) confidenceTotal = 0.99
          // have to do some weird conversion stuff to keep the decimals correct
          confidenceTotal = Number.parseFloat(confidenceTotal.toFixed(3))
          //update to current matched authors before proceeding with next tests
          let publicationAuthorMap = thisConf.getPublicationAuthorMap(publicationCsl)
          const newTest = {
            author: testAuthor,
            confirmedAuthors: confirmedAuthors[personPublication['publication']['doi']],
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
        }, {concurrency: 10})
        console.log(`Exiting loop 2 Test Author: ${testAuthor['names'][0]['lastName']}`)
      }, { concurrency: 1})
    }, { concurrency: 1 })

    console.log('Exited loop 1')
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
  async insertConfidenceTestToDB (confidenceTest, confidenceAlgorithmVersion) {
    // create confidence set
    const confidenceSet = {
      persons_publications_id: confidenceTest['persons_publications_id'],
      value: confidenceTest['newConf'],
      version: confidenceAlgorithmVersion
    }
    //insert confidence set
    const resultInsertConfidenceSet = await client.mutate(insertConfidenceSets([confidenceSet]))
    try {
      if (resultInsertConfidenceSet.data.insert_confidencesets.returning.length > 0) {
        const confidenceSetId = 0+parseInt(`${ resultInsertConfidenceSet.data.insert_confidencesets.returning[0].id }`)
        // insert confidence set items
        let confidenceSetItems = []
        let loopCounter = 0
        let confidenceItems = confidenceTest['confidenceItems']
        if (_.isString(confidenceItems)) {
          confidenceItems = JSON.parse(confidenceTest['confidenceItems'])
        }
        await pMap(_.keys(confidenceItems), async (rank) => {
          await randomWait(loopCounter)
          loopCounter += 1
          _.each(confidenceItems[rank], (confidenceType) => {
            const obj = {
              'confidenceset_id': confidenceSetId,
              'confidence_type_id': confidenceType['confidenceTypeId'],
              'value': confidenceType['confidenceValue'],
              'comment': confidenceType['confidenceComment']
            }
            // push the object into the array of rows to insert later
            confidenceSetItems.push(obj)
          })
        }, {concurrency: 3})

        // console.log(`Confidence set items are: ${JSON.stringify(confidenceSetItems, null, 2)}`)
        // console.log(`Confidence tests are: ${JSON.stringify(confidenceTest, null, 2)}`)
        // console.log(`Inserting confidence set item: ${JSON.stringify(confidenceSetItems, null, 2)}`)
        const resultInsertConfidenceSetItems = await client.mutate(insertConfidenceSetItems(confidenceSetItems))
        return resultInsertConfidenceSetItems.data.insert_confidencesets_items.returning
      } else {
        throw `Failed to insert confidence set no result returned for set: ${JSON.stringify(confidenceTest, null, 2)}`
      }
    } catch (error) {
      throw `Failed to insert confidence set: ${JSON.stringify(confidenceTest, null, 2)} with ${error}`
    }
  }

  async synchronizeReviews(doi, personId, newPersonPubId, index) {
    // check if the publication is already in the DB
    const personPubsInDB = await this.getDoiPersonPublications(doi, personId)
    const reviews = {}
    // assume reviews are ordered by datetime desc
    _.each(personPubsInDB, (personPub) => {
      // console.log(`Person Pub returned for review check is: ${JSON.stringify(personPub, null, 2)}`)
      _.each(personPub.reviews_aggregate.nodes, (review) => {
        if (!reviews[review.review_organization_value]) {
          reviews[review.review_organization_value] = review
        }
      })
    })

    if (_.keys(reviews).length > 0) {
      console.log(`Item #${index} New Person Pub Id: ${JSON.stringify(newPersonPubId, null, 2)} inserting reviews: ${_.keys(reviews).length}`)
      await pMap(_.keys(reviews), async (reviewOrgValue) => {
        // insert with same org value and most recent status to get in sync with other pubs in DB
        const review = reviews[reviewOrgValue]
        const mutateResult = await client.mutate(
          insertReview(review.user_id, newPersonPubId, review.review_type, reviewOrgValue)
        )
      }, { concurrency: 1})
    }
  }
  
}