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

async function insertPublicationAndAuthors (title, doi, csl, authors) {
  //console.log(`trying to insert pub: ${JSON.stringify(title,null,2)}, ${JSON.stringify(doi,null,2)}`)
  
  const mutatePubResult = await client.mutate(
    //for now convert csl json object to a string when storing in DB
    insertPublication (title, doi, JSON.stringify(csl))
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
  } catch (error){
    console.log(`Error on insert of Doi: ${doi} insert authors: ${JSON.stringify(insertAuthors,null,2)}`)
    console.log(error)
    throw error
  }

  return publicationId
}

async function getSimplifiedPersons(year) {
  const queryResult = await client.query(readPersonsByYear(year))

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: _.lowerCase(person.family_name),
      firstInitial: _.lowerCase(person.given_name[0]),
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
    const papersByDoi = _.keyBy(authorPapers, function(paper) {
      //strip off 'doi:' if present
      //console.log('in loop')
      return _.replace(paper['DOI'], 'doi:', '') 
    })
    //console.log('Finished load')
    return papersByDoi
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
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
      console.log(`Adding author ${JSON.stringify(author,null,2)}`)
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
async function matchPeopleToPaperAuthors(personMap, authors){

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
      //check for any matches of first initial or affiliation
      _.each(personMap[_.lowerCase(author.family)], async (testPerson) => {
        let confidenceVal = 0.0

        //match on last name found increment confidence by 0.3
        confidenceVal += 0.3
        
        if (_.lowerCase(author.given)[0] === testPerson.firstInitial){
          firstInitialFound = true
        }
        if(!_.isEmpty(author.affiliation)) {
          if(/notre dame/gi.test(author.affiliation[0].name)) {
            affiliationFound = true
          }
        }
        if (firstInitialFound) confidenceVal += 0.3
        if (affiliationFound) confidenceVal += 0.2
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
  const papersByDoi = await getPapersByDoi(path)

  //console.log(`Papers by DOI: ${JSON.stringify(papersByDoi,null,2)}`)

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
      //get CSL (citation style language) record by doi from dx.dio.org
      const cslRecords = await Cite.inputAsync(doi)
      //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)

      const csl = cslRecords[0]
      //retrieve the authors from the record and put in a map, returned above in array, but really just one element
      const authors = await getCSLAuthors(csl)
      //console.log(`Author Map found: ${JSON.stringify(authorMap,null,2)}`)

      //match paper authors to people
      //console.log(`Testing for Author Matches for DOI: ${doi}`)
      const matchedPersons = await matchPeopleToPaperAuthors(personMap, authors)
      //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

      // if at least one author, add the paper, and related personpub objects
      if((csl['type'] === 'article-journal' || csl['type'] === 'paper-conference' || csl['type'] === 'chapter') && csl.title && _.keys(matchedPersons).length > 0) {
        //push in csl record to jsonb blob
        //console.log(`Trying to insert for for DOI:${doi}, Title: ${csl.title}`)
        
        const publicationId = await insertPublicationAndAuthors(csl.title, doi, csl, authors)
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
  }, { concurrency: 30 })

  return doiStatus
}

//returns status map of what was done
async function main() {

  const pathsByYear = {
    2019: '../data/HCRI-pubs-2010-2019_-_Faculty_Selected.csv',
    2018: '../data/HCRI-pubs-2018_-_Faculty_Selected_2.csv',
    2017: '../data/HCRI-pubs-2017_-_Faculty_Selected_2.csv'
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
    const doiStatusByYear = await loadPersonPapersFromCSV(personMap, pathsByYear[year])
    doiStatus[year] = doiStatusByYear
  }, { concurrency: 1 })

  console.log(`DOI Status: ${JSON.stringify(doiStatus,null,2)}`)
}

main()