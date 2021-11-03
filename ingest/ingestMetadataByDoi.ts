import axios from 'axios'
import _, { lte } from 'lodash'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import insertPublication from './gql/insertPublication'
import insertPersonPublication from './gql/insertPersonPublication'
import insertPubAuthor from './gql/insertPubAuthor'
import { command as loadCsv } from './units/loadCsv'
import Cite from 'citation-js'
import pMap from 'p-map'
import path from 'path'
import humanparser from 'humanparser'
import { randomWait } from './units/randomWait'
import { command as writeCsv } from './units/writeCsv'
import { isDir, loadDirList, loadJSONFromFile } from './units/loadJSONFromFile'
import moment from 'moment'

import dotenv from 'dotenv'
import readPublicationsByDoi from './gql/readPublicationsByDoi'
import readPublicationsBySourceId from './gql/readPublicationsBySourceId'
import readPublicationsByTitle from './gql/readPublicationsByTitle'

import { getAllSimplifiedPersons } from './modules/queryNormalizedPeople'
import { CalculateConfidence } from './modules/calculateConfidence'
import { SemanticScholarDataSource } from './modules/semanticScholarDataSource'
import { WosDataSource } from './modules/wosDataSource'
import { PubMedDataSource } from './modules/pubmedDataSource'

import DataSourceConfig from './modules/dataSourceConfig'

import { Mutex } from './units/mutex'
import NormedPublication from './modules/normedPublication'
import BibTex from './modules/bibTex'
// import insertReview from '../client/src/gql/insertReview'

dotenv.config({
  path: '../.env'
})

const mutex = new Mutex()

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

// make sure to not be caching results if checking doi more than once
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

const pubmedConfig : DataSourceConfig = {
  baseUrl: process.env.PUBMED_BASE_URL,
  queryUrl: process.env.PUBMED_QUERY_URL,
  sourceName: process.env.PUBMED_SOURCE_NAME,
  publicationUrl: process.env.PUBMED_PUBLICATION_URL,
  pageSize: process.env.PUBMED_PAGE_SIZE,
  requestInterval: Number.parseInt(process.env.PUBMED_REQUEST_INTERVAL)
}
const pubmedDS : PubMedDataSource = new PubMedDataSource(pubmedConfig)

const semanticScholarConfig : DataSourceConfig = {
  baseUrl: process.env.SEMANTIC_SCHOLAR_BASE_URL,
  authorUrl: process.env.SEMANTIC_SCHOLAR_AUTHOR_URL,
  queryUrl: process.env.SEMANTIC_SCHOLAR_QUERY_URL,
  sourceName: process.env.SEMANTIC_SCHOLAR_SOURCE_NAME,
  publicationUrl: process.env.SEMANTIC_SCHOLAR_PUBLICATION_URL,
  pageSize: process.env.SEMANTIC_SCHOLAR_PAGE_SIZE,
  requestInterval: Number.parseInt(process.env.SEMANTIC_SCHOLAR_REQUEST_INTERVAL)
}
const semanticScholarDS : SemanticScholarDataSource = new SemanticScholarDataSource(semanticScholarConfig)

const wosConfig : DataSourceConfig = {
  baseUrl: process.env.WOS_BASE_URL,
  queryUrl: process.env.WOS_QUERY_URL,
  sourceName: process.env.WOS_SOURCE_NAME,
  userName: process.env.WOS_USERNAME,
  password: process.env.WOS_PASSWORD,
  pageSize: process.env.WOS_PAGE_SIZE,
  requestInterval: Number.parseInt(process.env.WOS_REQUEST_INTERVAL)
}
const wosDS : WosDataSource = new WosDataSource(wosConfig)


function getPublicationYear (csl) : Number {
  // look for both online and print dates, and make newer date win if different
  // put in array sorted by date
  let years = []
  years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
  years.push(_.get(csl, 'published.date-parts[0][0]', null))
  years.push(_.get(csl, 'issued.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-online.date-parts[0][0]', null))

  years = _.sortBy(years, (year) => { return year === null ?  0 : Number.parseInt(year) }).reverse()
  if (years.length > 0 && years[0] > 0) {
    // return the most recent year
    return years[0]
  } else {
    const item = new Cite(csl)
    const citation = item.format('citation')
    let year = null
    // last item in string is the year after the last comma
    const items = _.split(citation, ',')

    if (items.length > 0){
      year = items[items.length - 1]
      // get rid of any parentheses
      year = _.replace(year, ')', '')
      year = _.replace(year, '(', '')
      // remove any whitespace
      return Number.parseInt(_.trim(year))
    } else {
      throw(`Unable to determine publication year from csl: ${JSON.stringify(csl, null, 2)}`)
    }
  }

}

async function insertPublicationAndAuthors (title, doi, csl, authors, sourceName, sourceId, sourceMetadata, minPublicationYear?) {
  //console.log(`trying to insert pub: ${JSON.stringify(title,null,2)}, ${JSON.stringify(doi,null,2)}`)
  try  {
    const publicationYear = getPublicationYear (csl)
    if (minPublicationYear != undefined && publicationYear < minPublicationYear) {
      console.log(`Skipping adding publication from year: ${publicationYear}`)
      return
    }

    const publication = {
      title: title,
      doi: doi,
      year: publicationYear,
      csl: csl,  // put these in as JSONB
      source_name: sourceName,
      source_id: sourceId,
      source_metadata: sourceMetadata, // put these in as JSONB,
      csl_string: JSON.stringify(csl)
    }
    // console.log(`Writing publication: ${JSON.stringify(publication, null, 2)}`)
    const mutatePubResult = await client.mutate(
      //for now convert csl json object to a string when storing in DB
      insertPublication ([publication])
    )
    const publicationId = 0+parseInt(`${ mutatePubResult.data.insert_publications.returning[0].id }`);
    // console.log(`Added publication with id: ${ publicationId }`)

    const insertAuthors = _.map(authors, (author) => {
      return {
        publication_id: publicationId,
        family_name: author.family,
        given_name: author.given,
        position: author.position
      }
    })

    try {
      const mutateFirstAuthorResult = await client.mutate(
        insertPubAuthor(insertAuthors)
      )
    } catch (error) {
      console.log(`Error on insert of Doi: ${doi} insert authors: ${JSON.stringify(insertAuthors,null,2)}`)
      console.log(error)
      throw error
    }
    return publicationId
  } catch (error){
    console.log(`Error on insert of Doi: ${doi} insert publication`)
    console.log(error)
    throw error
  }
}

async function getPapersByDoi (csvPath: string, dataDirPath?: string) {
  console.log(`Loading Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const prefix = path.basename(csvPath).split('.')[0]
    const authorPapers: NormedPublication[] = await NormedPublication.loadFromCSV(csvPath, dataDirPath)
    // const authorPapers: any = await loadCsv({
    //  path: csvPath
    // })

    //normalize column names to all lowercase
    // const authorLowerPapers = _.mapValues(authorPapers, function (paper) {
    //   return _.mapKeys(paper, function (value, key) {
    //     return key.toLowerCase()
    //   })
    // })

    // console.log(`After lowercase ${_.keys(authorLowerPapers[0])}`)

    // console.log(`Author papers are: ${JSON.stringify(authorPapers, null, 2)}`)
    let counter = 0
    const papersByDoi = _.groupBy(authorPapers, function(paper: NormedPublication) {
      counter += 1
      //strip off 'doi:' if present
      if (!paper.doi || paper.doi.length <= 0){
        return `${paper.datasourceName}_${paper.sourceId}`
      } else {
        return paper.doi
      }
    })
    //console.log('Finished load')
    return papersByDoi
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}

async function getConfirmedAuthorsByDoi (papersByDoi, csvColumn :string) {
  const confirmedAuthorsByDoi = _.mapValues(papersByDoi, function (papers) {
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

function getConfirmedAuthorsByDOIAuthorList(papersByDoi, csvColumn :string) {
  const confirmedAuthorsByDoiAuthorList = _.mapValues(papersByDoi, function (papers) {
    //console.log(`Parsing names from papers ${JSON.stringify(papers,null,2)}`)
    return _.mapValues(papers, function (paper) {
      const unparsedList = paper[csvColumn]
      return createAuthorCSLFromString(unparsedList)
    })
  })
  return confirmedAuthorsByDoiAuthorList
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

async function getCSLAuthors(paperCsl){

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

interface MatchedPerson {
  person: any; // TODO: What is this creature?
  confidence: number;
}
// person map assumed to be a map of simplename to simpleperson object
// author map assumed to be doi mapped to two arrays: first authors and other authors
// returns a map of person ids to the person object and confidence value for any persons that matched coauthor attributes
// example: {1: {person: simplepersonObject, confidence: 0.5}, 51: {person: simplepersonObject, confidence: 0.8}}
async function matchPeopleToPaperAuthors(publicationCSL, simplifiedPersons, personMap, authors, confirmedAuthors, sourceName, sourceMetadata, minConfidence?) : Promise<Map<number,MatchedPerson>> {

  const calculateConfidence: CalculateConfidence = new CalculateConfidence()
  //match to last name
  //match to first initial (increase confidence)
  let matchedPersonMap = new Map()

  const confidenceTypesByRank = await calculateConfidence.getConfidenceTypesByRank()
   await pMap(simplifiedPersons, async (person) => {
    
     //console.log(`Testing Author for match: ${author.family}, ${author.given}`)

      const passedConfidenceTests = await calculateConfidence.performAuthorConfidenceTests (person, publicationCSL, confirmedAuthors, confidenceTypesByRank, sourceName, sourceMetadata)
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
      if (confidenceTotal > 0 && (!minConfidence || confidenceTotal >= minConfidence)) {
        // console.log(`Match found for Author: ${author.family}, ${author.given}`)
        let matchedPerson: MatchedPerson = { 'person': person, 'confidence': confidenceTotal }
        matchedPersonMap[person['id']] = matchedPerson
        //console.log(`After add matched persons map is: ${JSON.stringify(matchedPersonMap,null,2)}`)
      }
   }, { concurrency: 1 })

   //console.log(`After tests matchedPersonMap is: ${JSON.stringify(matchedPersonMap,null,2)}`)
  return matchedPersonMap
}

async function isPublicationAlreadyInDB (doi, sourceId, csl, sourceName) : Promise<boolean> {
  let foundPub = false
  const title = csl.title
  const publicationYear = getPublicationYear(csl)
  if (doi !== null){
    const queryResult = await client.query(readPublicationsByDoi(doi))
    // console.log(`Publications found for doi: ${doi}, ${queryResult.data.publications.length}`)
    if (queryResult.data.publications && queryResult.data.publications.length > 0){
      _.each(queryResult.data.publications, (publication) => {
        if (publication.doi && publication.doi !== null && _.toLower(publication.doi) === _.toLower(doi) && _.toLower(publication.source_name) === _.toLower(sourceName)) {
          foundPub = true
        }
      })
    }
  }
  if (!foundPub) {
    const querySourceIdResult = await client.query(readPublicationsBySourceId(sourceName, sourceId))
    // const authors = await getCSLAuthors(csl)
    // console.log(`Publications found for sourceId: ${sourceId}, ${querySourceIdResult.data.publications.length}`)
    _.each(querySourceIdResult.data.publications, (publication) => {
      // console.log(`checking publication for source id: ${sourceId}, publication: ${JSON.stringify(publication, null, 2)}`)
      if (_.toLower(publication.source_id) === _.toLower(sourceId) && _.toLower(publication.source_name) === _.toLower(sourceName)) {
        foundPub = true
      }
    })
  }
  if (!foundPub) {
    const titleQueryResult = await client.query(readPublicationsByTitle(title))
    _.each(titleQueryResult.data.publications, (publication) => {
      // console.log(`Checking existing publication title: '${publication.title}' year: '${JSON.stringify(publication.year)}' against title: '${title}' year: '${JSON.stringify(publicationYear)}' foundPub before is: ${foundPub}`)
      // check for something with same title and publication year as well
      if (publication.title === title && publication.year === publicationYear) { //} && authors.length === publication.publications_authors.length) {
        foundPub = true
      }
      // console.log(`Checking existing publication title: '${publication.title}' year: '${JSON.stringify(publication.year)}' against title: '${title}' year: '${JSON.stringify(publicationYear)}' foundPub after is: ${foundPub}`)
    })
  }
  return foundPub
}

interface DoiStatus {
  sourceName: string;
  addedDOIs: Array<string>;
  skippedDOIs: Array<string>;
  failedDOIs: Array<string>;
  errorMessages: Array<string>;
  combinedFailedRecords: {}
}

function lessThanMinPublicationYear(paper, doi, minPublicationYear) {
  // Check publication year to see if we should just ignore it
  let pubYearKey = undefined
  if (paper['publication_year']) {
    pubYearKey = 'publication_year'
  } else if (paper['pubYear']) {
    pubYearKey = 'pubYear'
  } else if (paper['pubyear']) {
    pubYearKey = 'pubyear'
  }

  if (minPublicationYear != undefined && pubYearKey != undefined && paper[pubYearKey]){
    const sourcePubYear = (paper[pubYearKey] === '' ? undefined : Number.parseInt(paper[pubYearKey]))
    if (sourcePubYear != undefined) {
      console.log(`Source pub year found for error publication: ${sourcePubYear} for doi: ${(doi ? doi: 'undefined')}`)
      return (sourcePubYear < minPublicationYear)
    }
  }
  return false    
}

async function loadConfirmedAuthorPapersFromCSV(path, dataDirPath) {
  try {
    const papersByDoi = await getPapersByDoi(path)
    return papersByDoi
  } catch (error){
    console.log(`Error on load confirmed authors: ${error}`)
    return {}
  }
}

async function loadConfirmedPapersByDoi(pathsByYear) {
  let confirmedPapersByDoi = new Map()
  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Loading ${year} Confirmed Authors`)
    //load data
    await pMap(pathsByYear[year], async (yearPath: string) => {
      let dataDir = yearPath
      if (!isDir(yearPath)) {
        dataDir = path.dirname(yearPath)
      }
      confirmedPapersByDoi = _.merge(confirmedPapersByDoi, await getPapersByDoi(yearPath))
    }, { concurrency: 1})
  }, { concurrency: 1 })
  return confirmedPapersByDoi
}

function isString(value) {
	return typeof value === 'string' || value instanceof String;
}

async function getCSLAuthorsFromSourceMetadata(sourceName, sourceMetadata) {
  if (sourceName === 'SemanticScholar') {
    return semanticScholarDS.getCSLStyleAuthorList(sourceMetadata)    
  } else if (sourceName === 'WebOfScience') {
    return wosDS.getCSLStyleAuthorList(sourceMetadata)    
  } else if (sourceName === 'PubMed'){
    return pubmedDS.getCSLStyleAuthorList(sourceMetadata)
  } else {
    return []
  }
}

//returns a map of three arrays: 'addedDOIs','failedDOIs', 'errorMessages'
async function loadPersonPapersFromCSV (personMap, paperPath, minPublicationYear?) : Promise<DoiStatus> {
  let count = 0
  let doiStatus: DoiStatus = {
    sourceName: 'CrossRef',
    addedDOIs: [],
    skippedDOIs: [],
    failedDOIs: [],
    errorMessages: [],
    combinedFailedRecords: {}
  }
  try {
    const minConfidence = 0.40
    const calculateConfidence: CalculateConfidence = new CalculateConfidence()
    // get the set of persons to test
    const testAuthors = await calculateConfidence.getAllSimplifiedPersons()
    // const testAuthors = []
    //create map of last name to array of related persons with same last name
    const testPersonMap = _.transform(testAuthors, function (result, value) {
      _.each(value.names, (name) => {
        (result[name['lastName']] || (result[name['lastName']] = [])).push(value)
      })
    }, {})
    let dataDir = paperPath
    if (!isDir(paperPath)) {
      dataDir = path.dirname(paperPath)
    }
  
    //check if confirmed column exists first, if not ignore this step
    let confirmedAuthorsByDoi = {}
    let confirmedAuthorsByDoiAuthorList = {}
    let bibTexByDoi = {}

    // get confirmed author lists to papers
    const confirmedPathsByYear = await getIngestFilePaths("../config/ingestConfidenceReviewFilePaths.json")
    const confirmedPapersByDoi: {} = await loadConfirmedPapersByDoi(confirmedPathsByYear)

    const confirmedAuthorColumn = 'nd author (last, first)'
    const confirmedAuthorListColumn = 'author(s)'
    const confirmedDois = _.keys(confirmedPapersByDoi)
   
    if (confirmedPapersByDoi && confirmedDois.length > 0){
      //get map of DOI's to an array of confirmed authors from the load table
      confirmedAuthorsByDoi = await getConfirmedAuthorsByDoi(confirmedPapersByDoi, confirmedAuthorColumn)
      confirmedAuthorsByDoiAuthorList = getConfirmedAuthorsByDOIAuthorList(confirmedPapersByDoi, confirmedAuthorListColumn)
      bibTexByDoi = _.mapValues(confirmedPapersByDoi, (papers) => {
        return _.mapValues(papers, (paper) => {
          return paper['bibtex']
        })
      })
      // console.log(`Confirmed Authors By Doi are: ${JSON.stringify(confirmedAuthorsByDoi,null,2)}`)
      // console.log(`Confirmed Authors By Doi author list are: ${JSON.stringify(confirmedAuthorsByDoiAuthorList,null,2)}`)
      // console.log(`Confirmed Authors BibText By Doi is: ${JSON.stringify(bibTexByDoi,null,2)}`)
    }

    const papersByDoi = await getPapersByDoi(paperPath, dataDir)
    const dois = _.keys(papersByDoi)
    count = dois.length
    console.log(`Papers by DOI Count: ${JSON.stringify(dois.length,null,2)}`)

    //initalize the doi query and citation engine
    Cite.async()

    let loopCounter = 0


    // let newPersonPublicationsByDoi = {}

    // let processedCount = 0
    
    let failedRecords = {}
    let undefinedDoiIndex = 0

    await pMap(_.keys(papersByDoi), async (doi, index) => {
      const processedCount = index + 1
      try {
        loopCounter += 1

        if (processedCount % 100 === 0){
          console.log(`Processed ${processedCount} papers...`)
          console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
          console.log(`Current DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs.length,null,2)}`)
          console.log(`Current Skipped DOIs: ${JSON.stringify(doiStatus.skippedDOIs.length,null,2)}`)
          console.log(`Current Added DOIs: ${JSON.stringify(doiStatus.addedDOIs.length,null,2)}`)
        }
        //have each wait a pseudo-random amount of time between 1-5 seconds

        await randomWait(loopCounter)
        let cslRecords = undefined
        let csl = undefined
        try {
        
          //get CSL (citation style language) record by doi from dx.dio.org
          cslRecords = await Cite.inputAsync(doi)
          //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)
          csl = cslRecords[0]
        } catch (error) {
          const normedPub = papersByDoi[doi][0]
          let bibTexStr = undefined
          let normedBibTex = undefined
          if (normedPub){
            normedBibTex = await NormedPublication.getBibTex(normedPub)
            if (normedBibTex) bibTexStr = BibTex.toString(normedBibTex)
          } 
          if (!bibTexStr || bibTexByDoi[doi] && _.keys(bibTexByDoi[doi]).length > 0) {
            console.log(`Trying to get csl from bibtex for confirmed doi: ${doi}...`)
            // manually construct csl from metadata in confirmed list
            bibTexStr = bibTexByDoi[doi][_.keys(bibTexByDoi[doi])[0]]
          }            
          if (bibTexStr) {
            // console.log(`Trying to get csl from bibtex str doi: ${doi}, for bibtex str ${bibTexStr} found...`)
            try {
              cslRecords = await Cite.inputAsync(bibTexStr)
              csl = cslRecords[0]
              // console.log(`CSL constructed: ${JSON.stringify(csl, null, 2)}`)
            } catch (error) {
              // try it without the abstract
              let newBibTex
              try {
                if (normedBibTex) {
                  console.log('Error encountered on bibTex, trying without abstract...')
                  newBibTex = BibTex.toString(normedBibTex, true)
                  cslRecords = await Cite.inputAsync(newBibTex)
                  csl = cslRecords[0]
                }
              } catch (error) {
                console.log(`Errored on csl from bibtex w/ or w/out abstract: ${bibTexStr}, error: ${error}`)
                throw (error)
              }
            }
          } else {
            console.log(`Throwing the error for doi: ${doi}`)
            throw (error)
          }
        }
        
        //retrieve the authors from the record and put in a map, returned above in array, but really just one element
        let authors = []
      
        if (csl) {
          // console.log(`Getting csl authors for doi: ${doi}`)
          authors = await getCSLAuthors(csl)
        }
        // default to the confirmed author list if no author list in the csl record
        // console.log(`Before check csl is: ${JSON.stringify(csl, null, 2)} for doi: ${doi}`)
        // console.log(`Before check authors are: ${JSON.stringify(authors, null, 2)} for doi: ${doi}`)
        if (authors.length <= 0 && csl && confirmedAuthorsByDoiAuthorList[doi] && _.keys(confirmedAuthorsByDoiAuthorList[doi]).length > 0) {
          authors = confirmedAuthorsByDoiAuthorList[doi][_.keys(confirmedAuthorsByDoiAuthorList[doi])[0]]
          csl.author = authors
        }
        // console.log(`Authors found: ${JSON.stringify(authors,null,2)}`)

        //for now default source is crossref
        doiStatus.sourceName = 'CrossRef'
        let sourceMetadata= csl
        let errorMessage = ''
        const types = [
          'manuscript',
          'article-journal',
          'article',
          'paper-conference',
          'chapter',
          'book',
          'peer-review',
          'report',
          'report-series'
        ]

        const firstPaper: NormedPublication = papersByDoi[doi][0]
        //check for SCOPUS
        //there may be more than one author match with same paper, and just grab first one
        if (firstPaper.datasourceName){
          doiStatus.sourceName = papersByDoi[doi][0].datasourceName
        } else if (papersByDoi[doi].length >= 1 && papersByDoi[doi][0]['scopus_record']){
          doiStatus.sourceName = 'Scopus'
          sourceMetadata = papersByDoi[doi][0]['scopus_record']
          if (_.isString(sourceMetadata)) sourceMetadata = JSON.parse(sourceMetadata)
          // console.log(`Scopus Source metadata is: ${JSON.stringify(sourceMetadata,null,2)}`)
        } else if (papersByDoi[doi].length >= 1 && papersByDoi[doi][0]['pubmed_record']){
          doiStatus.sourceName = 'PubMed'
          sourceMetadata = papersByDoi[doi][0]['pubmed_record']
          if (_.isString(sourceMetadata)) sourceMetadata = JSON.parse(sourceMetadata)
          // console.log(`Pubmed Source metadata found`)//is: ${JSON.stringify(sourceMetadata,null,2)}`)
        } else if (papersByDoi[doi].length >= 1 && papersByDoi[doi][0]['wos_record']){
          doiStatus.sourceName = 'WebOfScience'
          sourceMetadata = papersByDoi[doi][0]['wos_record']
          if (_.isString(sourceMetadata)) sourceMetadata = JSON.parse(sourceMetadata)
          // console.log(`WebOfScience Source metadata found`)//is: ${JSON.stringify(sourceMetadata,null,2)}`)
        } else {
          if (papersByDoi[doi] && papersByDoi[doi][0] && papersByDoi[doi][0]['source_name']) {
            doiStatus.sourceName = papersByDoi[doi][0]['source_name']
          }
        }

        if (papersByDoi[doi][0]['sourceMetadata']) {
          sourceMetadata = papersByDoi[doi][0].sourceMetadata
        } else if (papersByDoi[doi] && papersByDoi[doi][0] && papersByDoi[doi][0]['source_metadata']) {
          sourceMetadata = (isString(papersByDoi[doi][0]['source_metadata']) ? JSON.parse(papersByDoi[doi][0]['source_metadata']) : papersByDoi[doi][0]['source_metadata'])
        } 

        let publicationYear = undefined
        if (csl) {
          publicationYear = getPublicationYear (csl)
        } 

        if (publicationYear != undefined && minPublicationYear != undefined && publicationYear < minPublicationYear) {
          console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${doi} from source: ${doiStatus.sourceName} from year: ${publicationYear}`)
          doiStatus.skippedDOIs.push(doi)
        // if at least one author, add the paper, and related personpub objects
        } else if(csl && _.includes(types, csl['type']) && csl.title) {
          //push in csl record to jsonb blob

          //match paper authors to people
          //console.log(`Testing for Author Matches for DOI: ${doi}`)
          let matchedPersons = await matchPeopleToPaperAuthors(csl, testAuthors, personMap, authors, confirmedAuthorsByDoi[doi], doiStatus.sourceName, sourceMetadata, minConfidence)
          //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

          if (_.keys(matchedPersons).length <= 0){
            // try to match against authors from source if nothing found yet
            csl.author = await getCSLAuthorsFromSourceMetadata(doiStatus.sourceName, sourceMetadata)
            authors = csl.author
            // console.log(`After check from source metadata if needed authors are: ${JSON.stringify(csl.author, null, 2)}`)
            if (csl.author && csl.author.length > 0){
              matchedPersons = await matchPeopleToPaperAuthors(csl, testAuthors, personMap, authors, confirmedAuthorsByDoi[doi], doiStatus.sourceName, sourceMetadata, minConfidence)
            }
          }

          if (_.keys(matchedPersons).length > 0){
            const publicationYear = getPublicationYear (csl)
            if (minPublicationYear != undefined && publicationYear < minPublicationYear) {
              console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${doi} from source: ${doiStatus.sourceName} from year: ${publicationYear}`)
              doiStatus.skippedDOIs.push(doi)
            } else {
              await mutex.dispatch( async () => {
                const sourceId = firstPaper.sourceId
                // reset doi if it is a placeholder
                let checkDoi = doi
                if (_.toLower(doi) === _.toLower(`${doiStatus.sourceName}_${sourceId}`)){
                  checkDoi = null
                }
                const pubFound = await isPublicationAlreadyInDB(checkDoi, sourceId, csl, doiStatus.sourceName)
                if (!pubFound) {
                  // console.log(`Inserting Publication #${processedCount} of total ${count} DOI: ${doi} from source: ${doiStatus.sourceName}`)
                  const publicationId = await insertPublicationAndAuthors(csl.title, checkDoi, csl, authors, doiStatus.sourceName, sourceId, sourceMetadata)
                  // console.log('Finished Running Insert and starting next thread')
                  //console.log(`Inserted pub: ${JSON.stringify(publicationId,null,2)}`)

                  //console.log(`Publication Id: ${publicationId} Matched Persons count: ${_.keys(matchedPersons).length}`)
                  // now insert a person publication record for each matched Person
                  let loopCounter2 = 0
                  await pMap(_.keys(matchedPersons), async function (personId){
                    try {
                      const person = matchedPersons[personId]
                      loopCounter2 += 1
                      //have each wait a pseudo-random amount of time between 1-5 seconds
                      await randomWait(loopCounter2)
                      const mutateResult = await client.mutate(
                        insertPersonPublication(personId, publicationId, person['confidence'])
                      )

                      const newPersonPubId = await mutateResult.data.insert_persons_publications.returning[0]['id']
                    } catch (error) {
                      const errorMessage = `Error on add person id ${JSON.stringify(personId,null,2)} to publication id: ${publicationId}`
                      if (!failedRecords[doiStatus.sourceName]) failedRecords[doiStatus.sourceName] = []
                      _.each(papersByDoi[doi], (paper) => {
                        if (lessThanMinPublicationYear(paper, doi, minPublicationYear)) {
                          console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${(doi ? doi: 'undefined')} from source: ${doiStatus.sourceName}`)
                          doiStatus.skippedDOIs.push(doi)
                        } else {
                          doiStatus.failedDOIs.push(doi)
                          doiStatus.combinedFailedRecords[doi] = paper
                          console.log(errorMessage)
                          doiStatus.errorMessages.push(errorMessage)
                          paper = _.set(paper, 'error', errorMessage)
                          failedRecords[doiStatus.sourceName].push(paper)
                        }
                      }) 
                    }
                  }, { concurrency: 1 })
                  //if we make it this far succeeded
                  doiStatus.addedDOIs.push(doi)
                  // console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
                  // console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs.length,null,2)}`)
                  // console.log(`Skipped DOIs: ${JSON.stringify(doiStatus.skippedDOIs.length,null,2)}`)
                } else {
                  doiStatus.skippedDOIs.push(doi)
                  console.log(`Skipping doi already in DB #${processedCount} of total ${count}: ${doi} for source: ${doiStatus.sourceName}`)
                }
              })
            }
          } else {
            if (_.keys(matchedPersons).length <= 0){
              errorMessage = `No author match found for ${doi} and not added to DB`
              if (!failedRecords[doiStatus.sourceName]) failedRecords[doiStatus.sourceName] = []
              _.each(papersByDoi[doi], (paper) => {
                if (lessThanMinPublicationYear(paper, doi, minPublicationYear)) {
                  console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${(doi ? doi: 'undefined')} from source: ${doiStatus.sourceName}`)
                  doiStatus.skippedDOIs.push(doi)
                } else {
                  doiStatus.failedDOIs.push(doi)
                  doiStatus.combinedFailedRecords[doi] = paper
                  console.log(errorMessage)
                  doiStatus.errorMessages.push(errorMessage)
                  paper = _.set(paper, 'error', errorMessage)
                  failedRecords[doiStatus.sourceName].push(paper)
                }
              }) 
            }
          }
        } else {
          errorMessage = `${doi} and not added to DB with unknown type ${csl.type} or no title defined in DOI csl record` //, csl is: ${JSON.stringify(csl, null, 2)}`
          console.log(errorMessage)
          // console.log(`CSL is: ${JSON.stringify(csl, null, 2)}`)
          doiStatus.errorMessages.push(errorMessage)
          if (!failedRecords[doiStatus.sourceName]) failedRecords[doiStatus.sourceName] = []
          _.each(papersByDoi[doi], (paper) => {
            if (lessThanMinPublicationYear(paper, doi, minPublicationYear)) {
              console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${(doi ? doi: 'undefined')} from source: ${doiStatus.sourceName}`)
              doiStatus.skippedDOIs.push(doi)
            } else {
              doiStatus.failedDOIs.push(doi)
              doiStatus.combinedFailedRecords[doi] = paper
              console.log(errorMessage)
              doiStatus.errorMessages.push(errorMessage)
              paper = _.set(paper, 'error', errorMessage)
              failedRecords[doiStatus.sourceName].push(paper)
            }
          })
        }
        // console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs,null,2)}`)
        // console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
      } catch (error) {
        doiStatus.sourceName = 'CrossRef'
        if (papersByDoi[doi].length >= 1){
          if (papersByDoi[doi][0]['scopus_record']){
            doiStatus.sourceName = 'Scopus'
          } else if (papersByDoi[doi][0]['pubmed_record']){
            doiStatus.sourceName = 'PubMed'
          } else if (papersByDoi[doi][0]['wos_record']){
            doiStatus.sourceName = 'WebOfScience'
          }
        }
        if (!failedRecords[doiStatus.sourceName]) failedRecords[doiStatus.sourceName] = []
        const errorMessage = `Error on add DOI: '${doi}' error: ${error}`
        _.each(papersByDoi[doi], (paper) => {
          if (lessThanMinPublicationYear(paper, doi, minPublicationYear)) {
            console.log(`Skipping add Publication #${processedCount} of total ${count} DOI: ${(doi ? doi: 'undefined')} from source: ${doiStatus.sourceName}`)
            doiStatus.skippedDOIs.push(doi)
          } else {
            doiStatus.failedDOIs.push(doi)
            doiStatus.combinedFailedRecords[doi] = paper
            console.log(errorMessage)
            doiStatus.errorMessages.push(errorMessage)
            paper = _.set(paper, 'error', errorMessage)
            failedRecords[doiStatus.sourceName].push(paper)
          }
        }) 
        // console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs,null,2)}`)
        // console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
      }
    }, { concurrency: 20 }) // this needs to be 1 thread for now so no collisions on duplicate pubs in list when checking if already in DB

    // // add any reviews as needed
    // console.log('Synchronizing reviews with pre-existing publications...')
    // // console.log(`New Person pubs by doi: ${JSON.stringify(newPersonPublicationsByDoi, null, 2)}`)
    // let loopCounter3 = 0
    // await pMap(_.keys(newPersonPublicationsByDoi), async (doi) => {
    //   loopCounter3 += 1
    //   //have each wait a pseudo-random amount of time between 1-5 seconds
    //   await randomWait(loopCounter3)
    //   await pMap(newPersonPublicationsByDoi[doi], async (personPub) => {
    //     await synchronizeReviews(doi, personPub['person_id'], personPub['id'])
    //   }, {concurrency: 1})
    // }, {concurrency: 5})


    // if (doiStatus.failedDOIs && doiStatus.failedDOIs.length > 0){

    //   pMap(_.keys(failedRecords), async (doiStatus.sourceName) => {
    //     const failedCSVFile = `../data/${doiStatus.sourceName}_failed.${moment().format('YYYYMMDDHHmmss')}.csv`

    //     console.log(`Write failed doi's to csv file: ${failedCSVFile}`)
    //     // console.log(`Failed records are: ${JSON.stringify(failedRecords[doiStatus.sourceName], null, 2)}`)
    //     //write data out to csv
    //     await writeCsv({
    //       path: failedCSVFile,
    //       data: failedRecords[doiStatus.sourceName],
    //     })
    //   }, { concurrency: 1 })
    // }
   
    return doiStatus
  } catch (error){
    console.log(`Error on get path ${path}: ${error}`)
    throw(error)
    return doiStatus // Returning what has been completed
  }
}

const getIngestFilePaths = require('./getIngestFilePaths');

//returns status map of what was done
async function main() {

const pathsByYear = await getIngestFilePaths('../config/ingestFilePaths.json')

  //just get all simplified persons as will filter later
  const simplifiedPersons = await getAllSimplifiedPersons(client)

  let doiStatus = new Map()
  let doiFailed = new Map()
  let combinedFailed = {}

  let sourceName = undefined

  await pMap(_.keys(pathsByYear), async (year) => {
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    //create map of last name to array of related persons with same last name
    const personMap = _.transform(simplifiedPersons, function (result, value) {
      (result[value.lastName] || (result[value.lastName] = [])).push(value)
    }, {})

    console.log(`Loading ${year} Publication Data`)
    //load data
    await pMap(pathsByYear[year], async (yearPath) => {
      let loadPaths = []
      if (isDir(yearPath)) {
        loadPaths = loadDirList(yearPath)
      } else {
        loadPaths.push(yearPath)
      }
      await pMap(loadPaths, async (filePath) => {
        // skip any subdirectories
        if (!isDir(filePath)){
          const doiStatusByYear = await loadPersonPapersFromCSV(personMap, filePath, year)
          doiStatus[year] = doiStatusByYear
          sourceName = doiStatusByYear.sourceName
          combinedFailed = _.merge(combinedFailed, doiStatusByYear.combinedFailedRecords)
        }
        }, { concurrency: 1 })
    }, { concurrency: 1})
  }, { concurrency: 1 }) // these all need to be 1 thread so no collisions on checking if pub already exists if present in multiple files

  // console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
  await pMap(_.keys(pathsByYear), async (year) => {
     // write combined failure results limited to 1 per doi
     if (combinedFailed && _.keys(combinedFailed).length > 0){
      const combinedFailedValues = _.values(combinedFailed)
      const failedCSVFile = `../data/${sourceName}_combined_failed.${moment().format('YYYYMMDDHHmmss')}.csv`

      console.log(`Write failed doi's to csv file: ${failedCSVFile}`)
      // console.log(`Failed records are: ${JSON.stringify(failedRecords[sourceName], null, 2)}`)
      //write data out to csv
      await writeCsv({
        path: failedCSVFile,
        data: combinedFailedValues,
      })

    }
    console.log(`DOIs errors for year ${year}: ${JSON.stringify(doiStatus[year].errorMessages, null, 2)}`)
    console.log(`DOIs failed: ${doiStatus[year].failedDOIs.length} for year: ${year}`)
    console.log(`DOIs added: ${doiStatus[year].addedDOIs.length} for year: ${year}`)
    console.log(`DOIs skipped: ${doiStatus[year].skippedDOIs.length} for year: ${year}`)
  }, { concurrency: 1})
}

main()
