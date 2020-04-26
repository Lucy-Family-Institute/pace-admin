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
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'

const fs = require('fs');
const axios = require('axios');
const elsApiKey = '[INSERT_KEY_HERE]'
const elsCookie = '[INSERT_COOKIE_HERE]'
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

async function getScopusAuthorData(authorGivenName, authorFamilyName, authorScopusId, year, pageSize, offset){
    const baseUrl = 'https://api.elsevier.com/content/search/scopus'
    
    const authorQuery = "AU-ID("+ authorScopusId +")"
      
    console.log(`Querying scopus with year: ${year} authorId: ${authorScopusId}, offset: ${offset}, and query: ${authorQuery}`)
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

async function getScopusPaperAffiliation (scopusId) {
  const baseUrl = `https://api.elsevier.com/content/abstract/scopus_id/${scopusId}`

  //const fullUrl = baseUrl + doi
      

    const response = await axios.get(baseUrl, {
        headers: {
          'httpAccept' : 'text/xml',
          'X-ELS-APIKey' : elsApiKey,
        }
      });

      //console.log(response.data)
      return response.data['abstracts-retrieval-response']['affiliation'];
}

// async function getConfirmedDOIsByPerson(){
//   //get publications from DB that have confidence level 0.99 for some person
//   const queryResult = await client.query(readPublicationsByPersonByConfidence(0.9))

//   const personPubsByDoi = _.groupBy(queryResult.data.persons_publications, function (pub) {
//     return pub.publication.doi
//   })
  
//   //console.log(`Person Pubs by DOI confirmed count: ${_.keys(personPubsByDoi).length} person pubs are: ${JSON.stringify(personPubsByDoi,null,2)}`)
//   return personPubsByDoi
// }

async function getSimplifiedPersons() {

  // const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
  //   return {
  //     id: person.id,
  //     lastName: _.lowerCase(person.family_name),
  //     firstInitial: _.lowerCase(person.given_name[0]),
  //     firstName: _.lowerCase(person.given_name),
  //     startYear: person.start_date,
  //     endYear: person.end_date
  //   }
  // })
  const simplifiedPersons = [
    {
      authorId: '35227399700',
      lastName: 'hildreth',
      firstName: 'michael'
    },
    {
      authorId: '7004885835',
      lastName: 'tank',
      firstName: 'jennifer'
    }
  ]
  return simplifiedPersons
}

//does multiple requests against scopus search to get all papers for a given author name for a given year
//returns a map of papers with paper scopus id mapped to the paper metadata
async function getScopusAuthorPapers(person, year) {

  try {
    let searchPageResults = []
    //set request set size
    const pageSize = 25
    let offset = 0
    
    //get first page of results, do with first initial for now
    const authorSearchResult = await getScopusAuthorData(person.firstInitial, person.lastName, person.authorId, year, pageSize, offset)
    //console.log(`Author Search Result first page: ${JSON.stringify(authorSearchResult,null,2)}`)
    if (authorSearchResult && authorSearchResult['search-results']['opensearch:totalResults']){
      const totalResults = parseInt(authorSearchResult['search-results']['opensearch:totalResults'])
      console.log(`Author Search Result Total Results: ${totalResults}`)
      if (totalResults > 0 && authorSearchResult['search-results']['entry']){
        //console.log(`Author ${person.lastName}, ${person.firstName} adding ${authorSearchResult['search-results']['entry'].length} results`)
        searchPageResults.push(authorSearchResult['search-results']['entry'])
        if (totalResults > pageSize){
          let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
          //if no remainder subtract one since already did one call
          if ((totalResults % pageSize) <= 0) {
            numberOfRequests -= 1
          }
          //loop to get the result of the results
          console.log(`Making ${numberOfRequests} requests for ${person.authorId}:${person.lastName}, ${person.firstName}`)
          await pTimes (numberOfRequests, async function (index) {
            randomWait(1000,index)
            if (offset + pageSize < totalResults){
              offset += pageSize
            } else {
              offset += totalResults - offset
            }
            const authorSearchResultNext = await getScopusAuthorData(person.firstInitial, person.lastName, person.authorId, year, pageSize, offset)
            
            if (authorSearchResultNext['search-results']['entry']) {
              //console.log(`Getting Author Search Result page ${index+2}: ${authorSearchResultNext['search-results']['entry'].length} objects`)
              searchPageResults.push(authorSearchResultNext['search-results']['entry'])
            }
          }, { concurrency: 3})
        } else {
          console.log(`Author Search Result Total Results: ${totalResults}`)
        }
      }
    }
    
    //flatten the search results page as currently results one per page, and then keyBy scopus id
    return _.flattenDepth(searchPageResults, 1)
  } catch (error) {
    console.log(`Error on get info for person: ${error}`)
  }
}

//
// Takes in an array of scopus records and returns a hash of scopus id to object:
// 'year', 'title', 'journal', 'doi', 'scopus_id', 'scopus_record'
//
// scopus_record is the original json object
async function getSimplifliedScopusPapers(scopusPapers, simplifiedPerson){
  return _.map(scopusPapers, (paper) => {
    return {
      search_family_name : simplifiedPerson.lastName,
      search_given_name : simplifiedPerson.firstInitial,
      title: paper['dc:title'],
      journal: paper['prism:publicationName'],
      doi: paper['prism:doi'] ? paper['prism:doi'] : '',
      scopus_id: _.replace(paper['dc:identifier'], 'SCOPUS_ID:', ''),
      scopus_record : paper
    }
  })
}

// scopus_record is the original json object
async function getSimplifiedPaperAffiliations(scopusPaper, scopusPaperAffiliations, simplifiedPerson){
  return _.map(scopusPaperAffiliations, (affiliation) => {
    affiliation['author_scopus_id'] = simplifiedPerson.authorId
    affiliation['lastName'] = simplifiedPerson.lastName
    affiliation['firstName'] = simplifiedPerson.firstName
    affiliation['scopus_paper_id'] = scopusPaper.scopus_id
    affiliation['title'] = scopusPaper.title
    return affiliation
  })
}

async function main (): Promise<void> {

  const years = [ 2018, 2019, 2020 ]
  const scopusAffiliationId = "60021508"
  const dataHarvestPath = `../data/harvest_${moment().format('YYYYMMDDHHmmss')}`

  fs.mkdirSync(dataHarvestPath, (err) => {
    if (err) throw err;
  });

  
  // group affiliations by country and push for publication and then author
  // author -> publication -> convert to counts by country per year
  // collapse affiliation items together into overall total array
  // author -> counts by country per year (total co-authors and country)
  // author -> counts total over all years (total co-authors and country)
  // author -> counts by country per paper by year (i.e., duplicates for country removed per paper)
  // in root -> year_author_total_pubs_by_country.csv (duplicates on co-authors removed) - one file for each year, 
  //            year_author_total_coauthors_by_country.csv - one file for each year, 
  //            all_author_total_pubs_by_country.csv (all years, duplicates on co-authors removed)
  //            all_author_total_coauthors_by_country.csv (all years), 
  // folders -> raw_data -> all, 2020, 2019, 2018 -> lastName_scopusID -> pub -> affiliation items
  let authorCoauthorAffiliationByCountryByYear = {} // 
  
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons()
    console.log(`Simplified persons are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    // //create map of last name to array of related persons with same last name
    // const personMap = _.transform(simplifiedPersons, function (result, value) {
    //   (result[value.lastName] || (result[value.lastName] = [])).push(value)
    // }, {})

    console.log(`Loading Person Publication Data`)
    //load data from scopus
    let personCounter = 0

    // and total country affiliations across all papers counting the country for each co-author
    let affiliationCoauthorCountryCountsByAuthor = {}

    // now get distinct counts for each country for papers independent of number of coauthors across all papers
    let distinctCountryCountsAllPapersByAuthor = {}

    //have a map for capturing all country names
    let distinctCountries = {}

    await pMap(simplifiedPersons, async (person) => {
      //const person = simplifiedPersons[0]
  
      let succeededScopusPapers = []
      let failedScopusPapers = []

      try {
        personCounter += 1
        randomWait(1000,personCounter)
        
        const authorPapers = await getScopusAuthorPapers(person, year)
        //console.log(`Author Papers Found for ${person.lastName}, ${person.firstName}: ${JSON.stringify(authorPapers,null,2)}`)
        console.log(`Paper total for year: ${year} and author: ${person.lastName}, ${person.firstName}: ${JSON.stringify(_.keys(authorPapers).length,null,2)}`)
        
        //get simplified scopus papers
        const simplifiedAuthorPapers = await getSimplifliedScopusPapers(authorPapers, person)
        //console.log(`Simplified Scopus Author ${person.lastName}, ${person.firstName} Papers: ${JSON.stringify(simplifiedAuthorPapers,null,2)}`)

        //push in whole array for now and flatten later
        succeededScopusPapers.push(simplifiedAuthorPapers)

        //flatten out succeedScopusPaperArray for data for csv and change scopus json object to string
        const outputScopusPapers = _.map(_.flatten(succeededScopusPapers), paper => {
        paper['scopus_record'] = JSON.stringify(paper['scopus_record'])
          return paper
        })

        const personYearDataPath = `${dataHarvestPath}/${year}/${person.authorId}_${person.lastName}`
        //make the necessary directories
        //await fs.mkdir(personYearDataPath, (err) => {
        //    if (err) throw err;
        //});
        fs.mkdirSync(personYearDataPath, { recursive: true }, (err) => {
          if (err) throw err;
        });

        //console.log(outputScopusPapers)
        await writeCsv({
          path: `${personYearDataPath}/scopus.${year}.${person.authorId}.${person.lastName}.csv`,
          data: outputScopusPapers,
        });
        console.log(`Total Succeeded Papers Author ${person.authorId}.${person.lastName}.${person.firstName}: ${outputScopusPapers.length}`)
        console.log(`Get error messages: ${JSON.stringify(failedScopusPapers,null,2)}`)

        // have each affiliation counts for each country mapped to paper
        let affiliationsByCountryByPaper = {}

        // and total country affiliations across all papers counting the country for each co-author
        let affiliationCoauthorCountryCounts = {}

        // now get distinct counts for each country for papers independent of number of coauthors across all papers
        let distinctCountryCountsAllPapers = {}

        // get the affiliation arrays for each paper
        await pMap(outputScopusPapers, async (paper) => {
          //const paper = outputScopusPapers[0]
          // const paper = {
          //   scopus_id: '85082850250',
          //   title: 'Study of J/ψ meson production inside jets in pp collisions at s=8TeV'
          // }
          const paperAffiliations = await getScopusPaperAffiliation(paper.scopus_id)

          
          //console.log(`Author total paper affiliations for ${paper.scopus_id}:${paper.title}: ${JSON.stringify(paperAffiliations.length,null,2)}`)
        
          // //get simplified scopus papers
          const simplifiedPaperAffiliations = await getSimplifiedPaperAffiliations(paper, paperAffiliations, person)

          // push affiliations into map by paper scopus id
          affiliationsByCountryByPaper[paper.scopus_id] = _.groupBy(simplifiedPaperAffiliations, (affiliation) => {
            return affiliation['affiliation-country'].toLowerCase()
          })
          
          //console.log(`Simplified Paper Affiliations: ${JSON.stringify(simplifiedPaperAffiliations, null, 2)}`)
          
          // make a folder for author and write out affiliation data for each paper
          const paperDataPath = `${personYearDataPath}/${paper.scopus_id}`
          fs.mkdirSync(paperDataPath, { recursive: true }, (err) => {
            if (err) throw err;
          });
          // await fs.mkdir(paperDataPath, { recursive: true }, (err) => {
          //   if (err) throw err;
          // });

          //write data out to csv
          await writeCsv({
            path: `${paperDataPath}/scopus.${year}.au_id_${person.authorId}.${person.lastName}.${paper.scopus_id}.csv`,
            data: simplifiedPaperAffiliations,
          });
        }, {concurrency: 3})

        // combine arrays and do total for countries by paper for each author
        let affiliationCoauthorCountryCountsByPaper = {}
        
        // first group by country for each paper
        _.each(_.keys(affiliationsByCountryByPaper), (paperScopusId) => {
          affiliationCoauthorCountryCountsByPaper[paperScopusId] = {}
          _.each(_.keys(affiliationsByCountryByPaper[paperScopusId]), (country) => {
            // first add to country list (even if already there just overwrite, does not matter, more work to search if exists)
            distinctCountries[country] = 0
            affiliationCoauthorCountryCountsByPaper[paperScopusId][country] = affiliationsByCountryByPaper[paperScopusId][country].length
            if (affiliationCoauthorCountryCounts[country]) {
              affiliationCoauthorCountryCounts[country] += affiliationCoauthorCountryCountsByPaper[paperScopusId][country]
            } else {
              // if no previous use current one as start of total
              affiliationCoauthorCountryCounts[country] = affiliationCoauthorCountryCountsByPaper[paperScopusId][country]
            }
          })
        })

        // now get distinct counts for each country for papers independent of number of coauthors across all papers
        _.each(_.keys(affiliationCoauthorCountryCountsByPaper), (paperScopusId) => {
          _.each(_.keys(affiliationCoauthorCountryCountsByPaper[paperScopusId]), (country) => {
            if (distinctCountryCountsAllPapers[country]) {
              distinctCountryCountsAllPapers[country] += affiliationCoauthorCountryCountsByPaper[paperScopusId][country]
            } else {
              // if no previous use current one as start of total
              distinctCountryCountsAllPapers[country] = affiliationCoauthorCountryCountsByPaper[paperScopusId][country]
            }
          })
        })

        affiliationCoauthorCountryCountsByAuthor[person.authorId] = affiliationCoauthorCountryCountsByPaper
        // now get distinct counts for each country for papers independent of number of coauthors across all papers
        distinctCountryCountsAllPapersByAuthor[person.authorId] = distinctCountryCountsAllPapers

      } catch (error) {
        const errorMessage = `Error on get scopus papers for author: ${person.authorId}.${person.lastName}.${person.firstName}: ${error}`
        failedScopusPapers.push(errorMessage)
        console.log(errorMessage)
      }
    }, {concurrency: 3})

    // finally create array of counts, one row per author with union of all countries found
    // where if not found for a particular author make count 0
    // get list of countries
    let countries = _.keys(distinctCountries)
    let affiliationCoauthorCountryCountsRows = []
    // now populate row of values for each author for number of papers by country
    // and number for each country counted for each coauthor across all papers
    _.each(_.keys(affiliationCoauthorCountryCountsByAuthor), (authorId) => {
      let affiliationCoauthorCountryCountRow = {
        authorId: authorId
      } 
      _.each(countries, (country) => {
        if (affiliationCoauthorCountryCountsByAuthor[authorId][country]) {
          affiliationCoauthorCountryCountRow[country] = affiliationCoauthorCountryCountsByAuthor[authorId][country]
        } else {
          affiliationCoauthorCountryCountRow[country] = 0
        }
      })
      affiliationCoauthorCountryCountsRows.push(affiliationCoauthorCountryCountRow)
    })
    
    //next populate row for distinct country and author for papers
    // [need to do same as above loop]
  }, { concurrency: 1 })

  // //flatten out succeedScopusPaperArray for data for csv and change scopus json object to string
  // const outputScopusPapers = _.map(_.flatten(succeededScopusPapers), paper => {
  //   paper['scopus_record'] = JSON.stringify(paper['scopus_record'])
  //   return paper
  // })

  // //write data out to csv
  // //console.log(outputScopusPapers)
  // await writeCsv({
  //   path: `../data/scopus.${moment().format('YYYYMMDDHHmmss')}.csv`,
  //   data: outputScopusPapers,
  // });
  // console.log(`Total Succeeded Papers: ${outputScopusPapers.length}`)
  // console.log(`Get error messages: ${JSON.stringify(failedScopusPapers,null,2)}`)
}
  
main();


