import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import pTimes from 'p-times'
import readPersonsByYear from '../client/src/gql/readPersonsByYear'
import readPublicationsByPersonByConfidence from '../client/src/gql/readPublicationsByPersonByConfidence'
import { command as loadCsv } from './units/loadCsv'
import { split } from 'apollo-link'
import cslParser from './utils/cslParser' 

const axios = require('axios');
const elsApiKey = "[INSERT API KEY HERE]"

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('../config/config.js');

import Cite from 'citation-js'

//takes in a DOI and returns a json object formatted according to CSL (citation style language)
//https://citation.js.org/api/index.html
async function fetchByDoi(doi) {
  //initalize the doi query and citation engine
  Cite.async()

  //get CSL (citation style language) record by doi from dx.dio.org
  const cslRecords = await Cite.inputAsync(doi)
  //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)

  return cslRecords[0]
}

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

async function getScopusAuthorData(authorGivenName, authorFamilyName, year, scopusAffiliationId, pageSize, offset){
    const baseUrl = 'https://api.elsevier.com/content/search/scopus'
    
    //const affiliationId = "60021508"

    //const authorQuery = (query) {
    //  return {
    //    "AF-ID("+ affiliationId + ")"
    //  }
    //}
    const authorQuery = "AUTHFIRST("+ authorGivenName +") and AUTHLASTNAME("+ authorFamilyName+")" + " and AF-ID(" + scopusAffiliationId + ")"
      
    console.log(`Querying scopus with date: ${year}, offset: ${offset}, and query: ${authorQuery}`)
    const response = await axios.get(baseUrl, {
        headers: {
          'X-ELS-APIKey' : elsApiKey,
        },
        params: {
          query : authorQuery,
          date: year,
          count: pageSize,
          start: offset
        }
      });

      return response.data;
    
}

async function getScopusPaperData(doi){
  const baseUrl = 'https://api.elsevier.com/content/search/scopus'
  
  const affiliationId = "60021508"

  //const authorQuery = (query) {
  //  return {
  //    "AF-ID("+ affiliationId + ")"
  //  }
  //}
  const doiQuery = "DOI(" + doi + ")" 

  const response = await axios.get(baseUrl, {
      headers: {
        'X-ELS-APIKey' : elsApiKey,
      },
      params: {
        query : doiQuery
      }
    });

    return response.data;
  
}

async function getScopusPaperAbstractData (scopusId) {
  const baseUrl = `https://api.elsevier.com/content/abstract/scopus_id/${scopusId}`

  const response = await axios.get(baseUrl, {
    headers: {
      'httpAccept' : 'text/xml',
      'X-ELS-APIKey' : elsApiKey,
    }
  });

  //console.log(response.data)
  return response.data;
}

async function getScopusPaperFullText (doi) {
  const baseUrl = 'https://api.elsevier.com/content/article/eid/1-s2.0-S152500161830594X'

  const fullUrl = baseUrl + doi
      

    const response = await axios.get(baseUrl, {
        headers: {
          'httpAccept' : 'text/xml',
          'X-ELS-APIKey' : elsApiKey,
        }
      });

      //console.log(response.data)
      return response.data;
}

async function getScopusAuthorAffiliation (scopusId) {
  const baseUrl = 'https://api.elsevier.com/content/abstract/scopus_id/85059466526?field=author,affiliation'

  //const fullUrl = baseUrl + doi
      

    const response = await axios.get(baseUrl, {
        headers: {
          'httpAccept' : 'text/xml',
          'X-ELS-APIKey' : elsApiKey,
        }
      });

      //console.log(response.data)
      return response.data;
}

async function getConfirmedDOIsByPerson(){
  //get publications from DB that have confidence level 0.99 for some person
  const queryResult = await client.query(readPublicationsByPersonByConfidence(0.9))

  const personPubsByDoi = _.groupBy(queryResult.data.persons_publications, function (pub) {
    return pub.publication.doi
  })
  
  //console.log(`Person Pubs by DOI confirmed count: ${_.keys(personPubsByDoi).length} person pubs are: ${JSON.stringify(personPubsByDoi,null,2)}`)
  return personPubsByDoi
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

//does multiple requests against scopus search to get all papers for a given author name for a given year
//returns a map of papers with paper scopus id mapped to the paper metadata
async function getScopusAuthorPapers(person, year, scopusAffiliationId) {

  try {
    let searchPageResults = []
    //set request set size
    const pageSize = 25
    let offset = 0
    
    //get first page of results, do with first initial for now
    const authorSearchResult = await getScopusAuthorData(person.firstInitial, person.lastName, year, scopusAffiliationId, pageSize, offset)
    //console.log(`Author Search Result first page: ${JSON.stringify(authorSearchResult,null,2)}`)
    if (authorSearchResult && authorSearchResult['search-results']['opensearch:totalResults']){
      const totalResults = parseInt(authorSearchResult['search-results']['opensearch:totalResults'])
      console.log(`Author Search Result Total Results: ${totalResults}`)
      if (totalResults > 0 && authorSearchResult['search-results']['entry']){
        console.log(`Author ${person.lastName}, ${person.firstName} adding ${authorSearchResult['search-results']['entry'].length} results`)
        searchPageResults.push(authorSearchResult['search-results']['entry'])
        if (totalResults > pageSize){
          let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
          //if no remainder subtract one since already did one call
          if ((totalResults % pageSize) <= 0) {
            numberOfRequests -= 1
          }
          //loop to get the result of the results
          console.log(`Making ${numberOfRequests} requests for ${person.lastName}, ${person.firstName}`)
          await pTimes (numberOfRequests, async function (index) {
            randomWait(1000,index)
            if (offset + pageSize < totalResults){
              offset += pageSize
            } else {
              offset += totalResults - offset
            }
            const authorSearchResultNext = await getScopusAuthorData(person.firstInitial, person.lastName, year, scopusAffiliationId, pageSize, offset)
            //console.log(`Author Search Result page ${index+2}: ${JSON.stringify(authorSearchResult,null,2)}`)
            if (authorSearchResultNext['search-results']['entry']) {
              searchPageResults.push(authorSearchResultNext['search-results']['entry'])
            }
          }, { concurrency: 3})
        } else {
          console.log(`Author Search Result Total Results: ${totalResults}`)
        }
      }
    }
    //flatten the search results page as currently results one per page, and then keyBy scopus id
    let searchResults = _.keyBy(_.flatten(searchPageResults), function (page) {
      //strip off the SCOPUS_ID prefix if it is there
      return _.replace(page['dc:identifier'], 'SCOPUS_ID:', '')
    })
    return searchResults
  } catch (error) {
    console.log(`Error on get info for person: ${error}`)
  }
}

async function main (): Promise<void> {
    
  // ingest list of DOI's from CSV and relevant center author name
  // const authorPapers: any = await loadCsv({
  //   path: '../data/HCRI-pubs-2010-2019_-_Faculty_Selected.csv'
  // })

  // console.log(authorPapers)

  // const papersByDoi = _.keyBy(authorPapers, 'DOI')
  // console.log(papersByDoi)

  // const confirmedDOIsByPerson = await getConfirmedDOIsByPerson()
  // console.log(`Confirmed DOI by persons: ${JSON.stringify(confirmedDOIsByPerson,null,2)}`)

  const years = [ 2019 ]
  const scopusAffiliationId = "60021508"
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    //create map of last name to array of related persons with same last name
    const personMap = _.transform(simplifiedPersons, function (result, value) {
      (result[value.lastName] || (result[value.lastName] = [])).push(value)
    }, {})

    console.log(`Loading ${year} Publication Data`)
    //load data from scopus
    let personCounter = 0
    let succeededScopusPapers = []
    let failedScopusPapers = []
    await pMap(simplifiedPersons, async (person) => {
      //const person = simplifiedPersons[0]
      try {
        personCounter += 1
        randomWait(1000,personCounter)
        
        const authorPapers = await getScopusAuthorPapers(person, year, scopusAffiliationId)
        console.log(`Author Papers Found for ${person.lastName}, ${person.firstName}: ${JSON.stringify(_.keys(authorPapers),null,2)}`)
        console.log(`Author papers total for ${person.lastName}, ${person.firstName}: ${JSON.stringify(_.keys(authorPapers).length,null,2)}`)
        
        //get additional metadata to have DOI
        const scopusIds = _.keys(authorPapers)
        //get scopus id to doi
        const scopusIdsToDois = _.mapValues(authorPapers, function (paper, scopusId) {
          //console.log(`Getting DOI from paper: ${JSON.stringify(paper,null,2)}`)
          const doi =  paper['prism:doi'] ? paper['prism:doi'] : ''
          console.log(`DOI: ${doi} found for scopus id: ${scopusId}`)
          return doi
        })

        console.log(`Scopus IDs to DOIs: ${JSON.stringify(scopusIdsToDois,null,2)}`)
        
        //Cite.async()
        //get doi metadata in form of CSL (citation style language) json
        let counter = 0
        let scopusIdsToCsl = new Map()
        await pMap(_.keys(scopusIdsToDois), async function (scopusId) {
          try {
            counter += 1
            randomWait(1000,counter)
            
            // //get CSL (citation style language) record by doi from dx.dio.org
            // const cslRecords = await Cite.inputAsync(doi)
            // //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)
          
            // return cslRecords[0]
            const doi = scopusIdsToDois[scopusId]
            //log this paper and doi combination

            console.log(`Getting CSL for DOI: ${doi} ${person.lastName}, ${person.firstName}`)
            const csl = await fetchByDoi(doi)
            scopusIdsToCsl[scopusId] = csl
            const succeededMessage = `Getting CSL for DOI: ${doi} ${person.lastName}, ${person.firstName}`
            succeededScopusPapers.push(succeededMessage)
          } catch (error) {
            const  errorMessage = `Error on get CSL with Scopus Id: ${scopusId} ${person.lastName}, ${person.firstName}: ${error}`
            failedScopusPapers.push(errorMessage)
            console.log(errorMessage)
          }
        }, { concurrency: 15})

        // const scopusIdsToCSL = _.mapValues(scopusIdsToDois, async function (doi, scopusId, index) {
        //   randomWait(3000,index)
        //   const csl = fetchByDoi(doi)
        //   return csl
        // })
        
        //console.log(`CSL for SCOPUS ID: ${JSON.stringify(scopusIdsToCsl,null,2)}`)
        // if (scopusIds.length > 0){
        //   const scopusAbstractMetadata = getScopusPaperAbstractData(authorPapers[scopusIds[0]])
        //   //console.log(`Abstract metadata for ${person.lastName}, ${person.firstName} scopus id ${scopusIds[0]}: ${JSON.stringify(scopusAbstractMetadata,null,2)}`)
        //   //push in harvested SCOPUS metadata and DOI metadata
        // }
      } catch (error) {
        console.log(`Error on get scopus papers for author: ${person.lastName}, ${person.firstName}: ${error}`)
      }
    }, {concurrency: 3})

    console.log(`Total Succeeded Papers: ${succeededScopusPapers.length}`)
    console.log(`Get CSL error messages: ${JSON.stringify(failedScopusPapers,null,2)}`)
    // const doiStatusByYear = await loadPersonPapersFromCSV(personMap, pathsByYear[year])
    // doiStatus[year] = doiStatusByYear
  }, { concurrency: 1 })
  
  // let loopCounter = 0
  // // iterate through list of DOI's and...
  // await pMap(_.keys(confirmedDOIsByPerson), async (doi) => {
  //     console.log(`DOI is: ${ doi }`)
  //   // fetch paper by DOI
  //   try {
     
  //     loopCounter += 1
  //     randomWait(1000,loopCounter)

  //     const responseDoi = await getScopusPaperData(doi);
  //     if( responseDoi ) {
  //       //console.log(`Result found for DOI: ${ doi }`)
  //       //console.log(JSON.stringify(responseDoi['search-results'],null,2));
  //       //get paper scopus id
  //       if ( responseDoi['search-results']['entry'] ){
  //         if (responseDoi['search-results']['entry'][0]['dc:identifier']){
  //           const paperScopusId = responseDoi['search-results']['entry'][0]['dc:identifier'].split(':')[1]
  //           console.log(`DOI: ${doi} Paper Scopus ID Found: ${paperScopusId}`)

  //           //get author data
  //           const responseAbstract = await getScopusPaperAbstractData(paperScopusId);
  //           if( responseAbstract ) {
  //             console.log(`Response Author Data: ${JSON.stringify(responseAbstract,null,2)}`)
  //           }
  //         }
  //       }
  //     }
  //   } catch (error){
  //     console.log(`Error for DOI: ${ doi }`)
  //     console.error(error)
  //   }
  // }, { concurrency: 3 })
  //             //get author affiliation
  //             const responseAuthorAffiliation = await getScopusAuthorAffiliation(paperScopusId);
  //             if( responseAuthorAffiliation ) {
  //               console.log('Here1 ')
  //               const authors = _.map(responseAuthorAffiliation['abstracts-retrieval-response']['authors']['author'], function (value) {
  //                 console.log(`Value is: ${ JSON.stringify(value,null,2)}`)
  //                 console.log(`Surname: ${ JSON.stringify(value['ce:surname'])}`)
  //                 const author = {
  //                   'family' : value['ce:surname'],
  //                   'given' : value['ce:given-name'],
  //                   'givenInitials' : value['ce:initials'],
  //                   'scopusId' : value['@auid'],
  //                   'affiliationId' : value['affiliation']['@id']
  //                 }
  //                 return author
  //               })
  //               //console.log(JSON.stringify(responseFullText['full-text-retrieval-response'],null,2));
  //               console.log(`Here: ${ JSON.stringify(responseAuthorAffiliation,null,2) }`);
  //               console.log(`Here2: ${ JSON.stringify(authors,null,2) }`);

  //               //   //push to datastore
  //               //   //start with pushing to csv one row for each relevant author + doi + each author name variant and/or + orcid id + scopus id
  //               //   //doi, paper title, author list (name+id)

  //               // // match to target author for HCRI

  //               // // get full text

  //               // // mine for name of author variation

  //               // // capture name variant and ids
  //             }
  //           }
  //         }
  //       }
  //   } catch (error){
  //     console.log(`Error for DOI: ${ key }`)
  //     // console.error(error)
  //   }
  // })

      //   //get full text
      //   const responseFullText = await getScopusPaperFullText("10.1016/j.ymthe.2018.12.010");
      //   if( responseFullText ) {
      //     //console.log(JSON.stringify(responseFullText['full-text-retrieval-response'],null,2));
      //     //console.log(responseFullText);
      //   }

      // //const responseFullText = await getFullText(10);
      // //if( responseFullText ) {
      // //  console.log(responseFullText);
      // //}
      // console.log(`Config is: ${JSON.stringify(config)}`)
  }
  
  main();


