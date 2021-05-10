import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import dotenv from 'dotenv'
import pMap from 'p-map'
import humanparser from 'humanparser'
import Cite from 'citation-js'
import { randomWait } from './units/randomWait'
import { command as loadCsv } from './units/loadCsv'
import { CalculateConfidence } from './modules/calculateConfidence'

// import readPublicationsPersonCounts from './gql/readPublicationsPersonCounts'
// import readPublication from './gql/readPublication'
import readAllPersonPublications from './gql/readAllPersonPublications'
import readPublicationsCSL from './gql/readPublicationsCSL'
import readPersonPublications from './gql/readPersonPublications'
import insertPersonPublications from './gql/insertPersonPublications'
import { getNameKey } from './modules/queryNormalizedPeople'

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
  cache: new InMemoryCache()
})

async function getPapersByDoi (csvPath: string) {
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

function getConfirmedAuthorsByDoi (papersByDoi, csvColumn :string) {
  const confirmedAuthorsByDoi = _.mapValues(papersByDoi, function (papers) {
    //console.log(`Parsing names from papers ${JSON.stringify(papers,null,2)}`)
    return _.mapValues(papers, function (paper) {
      const unparsedName = paper[csvColumn]
      //console.log(`Parsing name: ${unparsedName}`)
      if (unparsedName) {
        const parsedName =  humanparser.parseName(unparsedName)
        //console.log(`Parsed Name is: ${JSON.stringify(parsedName,null,2)}`)
        return parsedName 
      } else {
        return undefined
      }
    })
  })
  return confirmedAuthorsByDoi
}

function createAuthorCSLFromString (authors) {
  const parsedAuthors = _.split(authors, ';')
  let authorPosition = 0
  let cslAuthors = []
  _.each(parsedAuthors, (parsedAuthor) => {
    const authorNames = _.split(parsedAuthor, ',')
    authorPosition += 1
    const cslAuthor = {
      family: authorNames[0],
      given: authorNames[1],
      position: authorPosition
    }
    cslAuthors.push(cslAuthor)
  })
  return cslAuthors
}

async function getCSL(doi, bibTex) {
  let csl = undefined
  let cslRecords = undefined
  try {
      Cite.async()
      //get CSL (citation style language) record by doi from dx.dio.org
      cslRecords = await Cite.inputAsync(doi)
      //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)
      csl = cslRecords[0]
  } catch (error) {
    if (bibTex){
      console.log(`Trying to get csl from bibtex for doi: ${doi}...`)
      // console.log(`Trying to get csl from bibtex for confirmed doi: ${doi}, for bibtex found...`)
      cslRecords = await Cite.inputAsync(bibTex)
      csl = cslRecords[0]
      // console.log(`CSL constructed: ${JSON.stringify(csl, null, 2)}`)
    } else {
      throw (error)
    }
  }
  return csl
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

interface MatchedPerson {
  person: any; // TODO: What is this creature?
  confidence: number;
}
// person map assumed to be a map of simplename to simpleperson object
// author map assumed to be doi mapped to two arrays: first authors and other authors
// returns a map of person ids to the person object and confidence value for any persons that matched coauthor attributes
// example: {1: {person: simplepersonObject, confidence: 0.5}, 51: {person: simplepersonObject, confidence: 0.8}}
async function matchPeopleToPaperAuthors(publicationCSL, simplifiedPersons, personMap, authors, confirmedAuthors) : Promise<Map<number,MatchedPerson>> {

  const calculateConfidence: CalculateConfidence = new CalculateConfidence()
  //match to last name
  //match to first initial (increase confidence)
  let matchedPersonMap = new Map()

  const confidenceTypesByRank = await calculateConfidence.getConfidenceTypesByRank()
   await pMap(simplifiedPersons, async (person) => {
    
     //console.log(`Testing Author for match: ${author.family}, ${author.given}`)

      const passedConfidenceTests = await calculateConfidence.performAuthorConfidenceTests (person, publicationCSL, confirmedAuthors, confidenceTypesByRank)
      // console.log(`Passed confidence tests: ${JSON.stringify(passedConfidenceTests, null, 2)}`)
      // returns a new map of rank -> confidenceTestName -> calculatedValue
      const passedConfidenceTestsWithConf = await calculateConfidence.calculateAuthorConfidence(passedConfidenceTests)
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

async function isPersonPublicationAlreadyInDB (publicationId, personId) : Promise<boolean> {
  const queryResult = await client.query(readPersonPublications(personId))
  let foundPub = false
  _.each(queryResult.data.persons_publications, (personPub) => {
    if (personPub.publication.id === publicationId) {
      foundPub = true
    }
  })
  return foundPub
}

async function loadConfirmedPapersByDoi(pathsByYear) {
  let confirmedPapersByDoi = new Map()
  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Loading ${year} Confirmed Authors`)
    //load data
    await pMap(pathsByYear[year], async (path: string) => {
      confirmedPapersByDoi = _.merge(confirmedPapersByDoi, await getPapersByDoi(path))
    }, { concurrency: 1})
  }, { concurrency: 1 })
  return confirmedPapersByDoi
}


async function getConfirmedPapersByDoi() { 
  //check if confirmed column exists first, if not ignore this step
  let confirmedAuthorsByDoi = {}
  let confirmedAuthorsByDoiAuthorList = {}
  let bibTexByDoi = {}

  // get confirmed author lists to papers
  const confirmedPathsByYear = await getIngestFilePaths("../config/ingestConfidenceReviewFilePaths.json")
  const confirmedPapersByDoi: {} = await loadConfirmedPapersByDoi(confirmedPathsByYear)

  return confirmedPapersByDoi
}

function getBibTexByDois(confirmedPapersByDoi) {
  const confirmedDois = _.keys(confirmedPapersByDoi)
  let bibTexByDoi = {}
  if (confirmedPapersByDoi && confirmedDois.length > 0){
    bibTexByDoi = _.mapValues(confirmedPapersByDoi, (papers) => {
      return _.mapValues(papers, (paper) => {
        return paper['bibtex']
      })
    })
  }
  return bibTexByDoi
}

function getBibTexByDoi(bibTexByDoi, doi) {
  let bibTex = undefined
  if (bibTexByDoi[doi] && _.keys(bibTexByDoi[doi]).length > 0){
    bibTex = bibTexByDoi[doi][_.keys(bibTexByDoi[doi])[0]]
  }
  return bibTex
}

//returns an array of author matches for the given doi, test authors, and confirmed authors
async function findAuthorMatches(testAuthors, confirmedAuthors, doi, csl, bibTex?) {
  
  // populate with array of person id's mapped person object
  let authorMatchesFound = {}

  try {
    //create map of last name to array of related persons with same last name
    const personMap = _.transform(testAuthors, function (result, value) {
      _.each(value['names'], (name) => {
        (result[name['lastName']] || (result[name['lastName']] = [])).push(value)
      })
    }, {})

    if (!csl) {
      console.log(`No csl found for doi: ${doi}, reloading csl`)
      csl = await getCSL(doi, bibTex)
    }

    //retrieve the authors from the record and put in a map, returned above in array, but really just one element
    let authors = await getCSLAuthors(csl)

    //match paper authors to people
    //console.log(`Testing for Author Matches for DOI: ${doi}`)
    const matchedPersons = await matchPeopleToPaperAuthors(csl, testAuthors, personMap, authors, confirmedAuthors)
    //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)
    return matchedPersons
  } catch (error){
    console.log(`Error on match authors to ${doi}: ${error}`)
    return []
  }
}

async function getPublicationsByDois(): Promise<{}> {
  const queryResult = await client.query(readPublicationsCSL())
  // console.log(`Publication person counts: ${JSON.stringify(queryResult.data.publications, null, 2)}`)
  return _.groupBy(queryResult.data.publications, (publication) => {
    return publication.doi
  })
}

async function getAllPersonPublications() {
  const queryResult = await client.query(readAllPersonPublications())
  // console.log(`Found publications for id: ${publicationId}: ${JSON.stringify(queryResult.data.publications, null, 2)}`)
  return queryResult.data.persons_publications
}

const getIngestFilePaths = require('./getIngestFilePaths');

//returns status map of what was done
async function main() {
  //just get all simplified persons as will filter later
  const calculateConfidence: CalculateConfidence = new CalculateConfidence()
  console.log('Starting load person list...')
  const simplifiedPersons = await calculateConfidence.getAllSimplifiedPersons()
  console.log('Finished load person list.')

  await randomWait(1, 1000)

  // get current publication id w doi and group by doi
  console.log('Starting get publications by doi...')
  const pubsByDoi = await getPublicationsByDois()
  console.log('Finished get publications by doi.')

  console.log('Starting load confirmed authors and bibtex...')

  let authorsMatchedByDoi = {}
  const confirmedAuthorColumn = 'nd author (last, first)'
  const confirmedPapersByDoi = await getConfirmedPapersByDoi()
  const confirmedAuthorsByDoi = getConfirmedAuthorsByDoi(confirmedPapersByDoi, confirmedAuthorColumn)
  const bibTexByDois = getBibTexByDois(confirmedPapersByDoi)

  console.log('Finished loading confirmed authors and bibtex.')
  
  console.log('Begin loading existing author publication matches...')
  const allPersonPublications = await getAllPersonPublications()
  // console.log(`All person publications are: ${JSON.stringify(allPersonPublications, null, 2)}`)
  const pubsByPersonId = _.groupBy(allPersonPublications, (personPub) => {
    return personPub['person_id']
  })
  // console.log(`pubs by person id loaded: ${JSON.stringify(pubsByPersonId, null, 2)}`)
  const pubIdsByPersonId = _.mapValues(pubsByPersonId, (personPubs) => {
    return _.map(personPubs, (personPub) => {
      return personPub['publication_id']
    })
  })
  // console.log(`Pub Ids by person ids loaded: ${JSON.stringify(pubIdsByPersonId, null, 2)}`)
  console.log('Finished loading existing author publication matches.')

  // console.log(`Confirmed Authors By Doi are: ${JSON.stringify(confirmedAuthorsByDoi,null,2)}`)
  // console.log(`Confirmed Authors BibText By Doi is: ${JSON.stringify(bibTexByDoi,null,2)}`)

  // iterate through dois
  console.log('Starting check publications for new author matches...')

  // put new person pub matches into map of person_id to array of publication_id's
  const insertPersonPubs = []
  const totalDois = _.keys(pubsByDoi).length

  const subset = _.chunk(_.keys(pubsByDoi), 20)
  await pMap(subset[0], async (doi, index) => {
  // await pMap(_.keys(pubsByDoi), async (doi, index) => {
    const bibTex = getBibTexByDoi(bibTexByDois, doi)
    const csl = pubsByDoi[doi][0]['csl']
    authorsMatchedByDoi[doi] = await findAuthorMatches(simplifiedPersons, confirmedAuthorsByDoi[doi], doi, csl, bibTex)
    // console.log(`#${index+1} of ${totalDois} - Checking doi: ${doi} for author matches. ${authorsMatchedByDoi[doi].length} matches found`)
    // check for new author matches
    let newAuthorsMatched = 0
    await pMap(_.keys(authorsMatchedByDoi[doi]), async (personId) => {
      let matchedAuthor = false
      await pMap(pubsByDoi[doi], async (pub) => {
        // console.log(`Pub ids by person id are: ${pubIdsByPersonId[personId]}, check for pub id: ${pub['id']}`)
        // const alreadyInDB = await isPersonPublicationAlreadyInDB(pub['id'], personId)
        // if (!alreadyInDB){
        if (_.indexOf(pubIdsByPersonId[personId], pub['id'])< 0){
          const newPersonPub = {
            person_id: personId,
            publication_id: pub['id'],
            confidence: authorsMatchedByDoi[doi][personId]['confidence']
          }
          insertPersonPubs.push(newPersonPub)
          matchedAuthor = true
        }
      }, { concurrency: 1 })
      if (matchedAuthor) {
        newAuthorsMatched += 1
      }
    }, { concurrency: 1 }) 
    console.log(`#${index+1} of ${totalDois} - Checking doi: ${doi} for author matches. ${newAuthorsMatched} new matches of ${_.keys(authorsMatchedByDoi[doi]).length} matches found`)

  }, { concurrency: 60 })
  
  console.log('Finished check publications for new author matches.')
  // console.log(`Insert Person Pubs to add: ${JSON.stringify(insertPersonPubs, null, 2)}`)
  console.log(`Insert Person Pubs to add: ${JSON.stringify(insertPersonPubs.length, null, 2)}`)

  const mutateResult = await client.mutate(
    insertPersonPublications(insertPersonPubs)
  )

  console.log(`Inserted ${mutateResult.data.insert_persons_publications.returning.length} person publication matches.`)
  
}

main()
