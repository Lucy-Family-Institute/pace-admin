import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pEachSeries from 'p-each-series'
import readUsers from '../client/src/gql/readPersons'
import readPersonsByYear from '../client/src/gql/readPersonsByYear'
import insertPublication from './gql/insertPublication'
import insertPersonPublication from './gql/insertPersonPublication'
import insertPubAuthor from './gql/insertPubAuthor'
import { command as loadCsv } from './units/loadCsv'
import { responsePathAsArray } from 'graphql'
import Cite from 'citation-js'
import pMap from 'p-map'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'

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

// var publicationId= undefined;

// async function getDoiPaperData (doi) {
//   const result = await axios({
//       method: 'get',
//       url: `http://dx.doi.org/${doi}`,
      
//       headers: { 
//         //get result in csl-json format
//         'Accept': 'application/citeproc+json'
//       }
//   })

//   return result.data;
// }

async function getCitationApa (doi) {

    Cite.async()

    const citeResult = await Cite.inputAsync(doi)
    const citeObj = new Cite(citeResult)

    // create formatted citation as test
    const apaCitation = citeObj.format('bibliography', {
      template: 'apa'
    })
    console.log(`Converted DOI: ${doi} to citation: ${apaCitation}`)
    return apaCitation
}

function getSimpleName (lastName, firstInitial){
  return `${lastName}, ${firstInitial}`
}

function getPublicationYear (csl) {
  // look for both online and print dates, and make newer date win if different
  // put in array sorted by date
  let years = []
  years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
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
      return _.trim(year)
    } else {
      throw(`Unable to determine publication year from csl: ${JSON.stringify(csl, null, 2)}`)
    }
  }
  
}

async function insertPublicationAndAuthors (title, doi, csl, authors, sourceName, sourceMetadata) {
  //console.log(`trying to insert pub: ${JSON.stringify(title,null,2)}, ${JSON.stringify(doi,null,2)}`)
  try  {
    const publicationYear = getPublicationYear (csl)
 
    const publication = {
      title: title,
      doi: doi,
      year: publicationYear,
      csl: csl,  // put these in as JSONB
      source_name: sourceName,  
      source_metadata: sourceMetadata, // put these in as JSONB,
      csl_string: JSON.stringify(csl)
    }
    const mutatePubResult = await client.mutate(
      //for now convert csl json object to a string when storing in DB
      insertPublication ([publication])
    )
    //console.log(`Insert mutate pub result ${JSON.stringify(mutatePubResult.data,null,2)}`)
    const publicationId = 0+parseInt(`${ mutatePubResult.data.insert_publications.returning[0].id }`);
    console.log(`Added publication with id: ${ publicationId }`)
    
    //console.log(`Pub Id: ${publicationId} Adding ${authorMap.firstAuthors.length + authorMap.otherAuthors.length} total authors`)
    const insertAuthors = _.map(authors, (author) => {
      return {
        publication_id: publicationId,
        family_name: author.family, 
        given_name: author.given, 
        position: author.position
      }
    })

    try {
      //console.log(`publication id: ${ publicationId } inserting first author: ${ JSON.stringify(firstAuthor) }`)
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
    console.log(`Error on insert of Doi: ${doi} insert publication, csl: ${JSON.stringify}`)
    console.log(error)
    throw error
  }
}

async function getSimplifiedPersons(year) {
  const queryResult = await client.query(readPersonsByYear(year))

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: _.lowerCase(person.family_name),
      firstInitial: _.lowerCase(person.given_name[0]),
      firstName: _.lowerCase(person.given_name),
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
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

// person map assumed to be a map of simplename to simpleperson object
// author map assumed to be doi mapped to two arrays: first authors and other authors
// returns a map of person ids to the person object and confidence value for any persons that matched coauthor attributes
// example: {1: {person: simplepersonObject, confidence: 0.5}, 51: {person: simplepersonObject, confidence: 0.8}}
async function matchPeopleToPaperAuthors(personMap, authors, confirmedAuthors){

  //match to last name
  //match to first initial (increase confidence)
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

//returns a map of three arrays: 'addedDOIs','failedDOIs', 'errorMessages'
async function loadPersonPapersFromCSV (personMap, path) {
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

    //initalize the doi query and citation engine
    Cite.async()

    let loopCounter = 0

    let doiStatus = {
      'addedDOIs': [],
      'failedDOIs': [],
      'errorMessages': []
    }

    await pMap(_.keys(papersByDoi), async (doi) => {
      try {

        loopCounter += 1
        //have each wait a pseudo-random amount of time between 1-5 seconds
        await randomWait(1000, loopCounter)
        
        //get CSL (citation style language) record by doi from dx.dio.org
        const cslRecords = await Cite.inputAsync(doi)
        //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)

        const csl = cslRecords[0]
        //retrieve the authors from the record and put in a map, returned above in array, but really just one element
        const authors = await getCSLAuthors(csl)
        //console.log(`Author Map found: ${JSON.stringify(authorMap,null,2)}`)

        //match paper authors to people
        //console.log(`Testing for Author Matches for DOI: ${doi}`)
        const matchedPersons = await matchPeopleToPaperAuthors(personMap, authors, confirmedAuthorsByDoi[doi])
        //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

        // if at least one author, add the paper, and related personpub objects
        if((csl['type'] === 'article-journal' || csl['type'] === 'paper-conference' || csl['type'] === 'chapter') && csl.title && _.keys(matchedPersons).length > 0) {
          //push in csl record to jsonb blob
          //console.log(`Trying to insert for for DOI:${doi}, Title: ${csl.title}`)
          
          //for now default source is crossref
          let sourceName = 'CrossRef'
          let sourceMetadata= csl
          //check for SCOPUS
          //console.log(`Checking paper if from scopus: ${JSON.stringify(papersByDoi[doi],null,2)}`)
          //there may be more than one author match with same paper, and just grab first one
          if (papersByDoi[doi].length >= 1 && papersByDoi[doi][0]['scopus_record']){
            sourceName = 'Scopus'
            sourceMetadata = papersByDoi[doi][0]['scopus_record']
            if (_.isString(sourceMetadata)) sourceMetadata = JSON.parse(sourceMetadata)
            console.log(`Scopus Source metadata is: ${JSON.stringify(sourceMetadata,null,2)}`)
          } else if (papersByDoi[doi].length >= 1 && papersByDoi[doi][0]['pubmed_record']){
            sourceName = 'PubMed'
            sourceMetadata = papersByDoi[doi][0]['pubmed_record']
            if (_.isString(sourceMetadata)) sourceMetadata = JSON.parse(sourceMetadata)
            console.log(`Pubmed Source metadata found`)//is: ${JSON.stringify(sourceMetadata,null,2)}`)
          }
          console.log(`Inserting Publication DOI: ${doi} from source: ${sourceName}`)
          const publicationId = await insertPublicationAndAuthors(csl.title, doi, csl, authors, sourceName, sourceMetadata)
          console.log('Finished Running Insert and starting next thread')
          //console.log(`Inserted pub: ${JSON.stringify(publicationId,null,2)}`)

          //console.log(`Publication Id: ${publicationId} Matched Persons count: ${_.keys(matchedPersons).length}`)
          // now insert a person publication record for each matched Person
          let loopCounter2 = 0
          _.forEach(matchedPersons, async function (person, id){
            try {
              loopCounter2 += 1
            //have each wait a pseudo-random amount of time between 1-5 seconds
              await randomWait(1000, loopCounter2)
              const mutateResult = await client.mutate(
                insertPersonPublication(id, publicationId, person['confidence'])        
              )
            //console.log(`added person publication id: ${ mutateResult.data.insert_persons_publications.returning[0].id }`)
            } catch (error) {
              const errorMessage = `Error on add person ${JSON.stringify(person,null,2)} to publication id: ${publicationId}`
              console.log(errorMessage)
              doiStatus.errorMessages.push(errorMessage)
            }
          })
          //if we make it this far succeeded
          doiStatus.addedDOIs.push(doi)
          console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs,null,2)}`)
          console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
        } else {
          if (_.keys(matchedPersons).length <= 0){
            const errorMessage = `No author match found for ${doi} and not added to DB` 
            console.log(errorMessage)
            doiStatus.errorMessages.push(errorMessage)
          } else {
            const errorMessage = `${doi} and not added to DB because not an article or no title defined in DOI csl record`
            console.log(errorMessage)
            doiStatus.errorMessages.push(errorMessage)
          }
          doiStatus.failedDOIs.push(doi)
          console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs,null,2)}`)
          console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
        }
      } catch (error) {
        doiStatus.failedDOIs.push(doi)
        const errorMessage = `Error on add DOI: ${doi} error: ${error}` 
        doiStatus.errorMessages.push(errorMessage)
        console.log(errorMessage)
        console.log(`DOIs Failed: ${JSON.stringify(doiStatus.failedDOIs,null,2)}`)
        console.log(`Error Messages: ${JSON.stringify(doiStatus.errorMessages,null,2)}`)
      }
    }, { concurrency: 5 })

    return doiStatus
  } catch (error){
    console.log(`Error on get path ${path}: ${error}`)
  }
}

//returns status map of what was done
async function main() {

  const pathsByYear = {
    // 2019: ['../data/scopus.2019.20200320103319.csv']
    // 2019: ['../data/HCRI-pubs-2019_-_Faculty_Selected_2.csv', '../data/scopus.2019.20200320103319.csv'],
    // 2018: ['../data/HCRI-pubs-2018_-_Faculty_Selected_2.csv'],
    //2017: ['../data/HCRI-pubs-2017_-_Faculty_Selected_2.csv']
    2017: ['../data/authorsByAwards.20200405090557.csv']
  }

  let doiStatus = new Map()
  await pMap(_.keys(pathsByYear), async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    //create map of last name to array of related persons with same last name
    const personMap = _.transform(simplifiedPersons, function (result, value) {
      (result[value.lastName] || (result[value.lastName] = [])).push(value)
    }, {})

    console.log(`Loading ${year} Publication Data`)
    //load data
    await pMap(pathsByYear[year], async (path) => {
      const doiStatusByYear = await loadPersonPapersFromCSV(personMap, path)
      doiStatus[year] = doiStatusByYear
    }, { concurrency: 1})
  }, { concurrency: 1 })

  console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
}

main()