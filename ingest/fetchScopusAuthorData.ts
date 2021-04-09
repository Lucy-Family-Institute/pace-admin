import _ from 'lodash'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import pTimes from 'p-times'
import readPersonsByYear from '../client/src/gql/readPersonsByYear'
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'
import dotenv from 'dotenv'
import { randomWait } from './units/randomWait'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');
const elsApiKey = process.env.SCOPUS_API_KEY

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('../config/config.js');

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

async function getScopusAuthorData(authorGivenName, authorFamilyName, year, scopusAffiliationId, pageSize, offset){
    const baseUrl = 'https://api.elsevier.com/content/search/scopus'

    const authorQuery = "AUTHFIRST("+ authorGivenName +") and AUTHLASTNAME("+ authorFamilyName+") and AF-ID(" + scopusAffiliationId + ")"

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

async function getSimplifiedPersons(year) {
  const queryResult = await client.query(readPersonsByYear(year))

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: person.family_name,
      firstInitial: person.given_name[0],
      firstName: person.given_name, 
      lowerLastName: _.lowerCase(person.family_name),
      lowerFirstInitial: _.lowerCase(person.given_name[0]),
      lowerFirstName: _.lowerCase(person.given_name),
      startDate: person.start_date,
      endDate: person.end_date
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
    let totalResults = 0

    //get first page of results, do with first initial for now
    const authorSearchResult = await getScopusAuthorData(person.lowerFirstInitial, person.lowerLastName, year, scopusAffiliationId, pageSize, offset)
    if (authorSearchResult && authorSearchResult['search-results']['opensearch:totalResults']){
      totalResults = parseInt(authorSearchResult['search-results']['opensearch:totalResults'])
      console.log(`Author Search Result Total Results: ${totalResults}`)
      if (totalResults > 0 && authorSearchResult['search-results']['entry']){
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
            randomWait(index)
            if (offset + pageSize < totalResults){
              offset += pageSize
            } else {
              offset += totalResults - offset
            }
            const authorSearchResultNext = await getScopusAuthorData(person.lowerFirstInitial, person.lowerLastName, year, scopusAffiliationId, pageSize, offset)

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
    const flattenedResults = _.flattenDepth(searchPageResults, 1)
    if (flattenedResults.length != totalResults) {
      throw `All expected results not returned for ${person.lastName}, ${person.firstName}, expected: ${totalResults} actual: ${flattenedResults.length}`
    } else {
      console.log(`${year} Retrieved (${flattenedResults.length} of ${totalResults}) expected results for ${person.lastName}, ${person.firstName}`)
    }
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
async function getSimplifliedScopusPapers(scopusPapers, simplifiedPerson, scopusAffiliationId, query){
  return _.map(scopusPapers, (paper) => {
    return {
      search_person_id : simplifiedPerson.id,
      search_person_family_name : simplifiedPerson.lastName,
      search_person_given_name : simplifiedPerson.firstName,
      search_person_given_name_initial: simplifiedPerson.firstInitial,
      search_person_start_date: `${simplifiedPerson.startDate}`,
      search_person_end_date: `${(simplifiedPerson.endDate ? simplifiedPerson.endDate : '')}`,
      search_person_source_ids_scopus_affiliation_id: scopusAffiliationId,
      search_query: query, 
      publication_year: paper['prism:coverDate'],
      title: paper['dc:title'],
      journal: paper['prism:publicationName'],
      journal_issn: paper['prism:issn'],
      journal_eissn: paper['prism:eIssn'],
      publication_date: paper['prism:coverDate'],
      doi: paper['prism:doi'] ? paper['prism:doi'] : '',
      source_id: _.replace(paper['dc:identifier'], 'SCOPUS_ID:', ''),
      source_metadata: paper,
      source_name: 'Scopus'
    }
  })
}

async function main (): Promise<void> {

  const years = [ 2020, 2019, 2018, 2017, 2016 ]
  const scopusAffiliationId = "60021508"
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    console.log(`Loading ${year} Publication Data`)
    //load data from scopus
    let personCounter = 0
    let succeededScopusPapers = []
    let failedScopusPapers = []

    // test a single person as needed
    const simplifiedPersons2 = _.filter(simplifiedPersons, (person) => {
      return person.id === 52
    })

    await pMap(simplifiedPersons, async (person) => {
      //const person = simplifiedPersons[0]
      try {
        personCounter += 1
        randomWait(personCounter)

        const authorPapers = await getScopusAuthorPapers(person, year, scopusAffiliationId)
        console.log(`Author papers total for ${person.lastName}, ${person.firstName}: ${JSON.stringify(_.keys(authorPapers).length,null,2)}`)

        //get simplified scopus papers
        const authorQuery = "AUTHFIRST("+ person.lowerFirstInitial +") and AUTHLASTNAME("+ person.lowerLastName+") and AF-ID(" + scopusAffiliationId + ")"
        const simplifiedAuthorPapers = await getSimplifliedScopusPapers(authorPapers, person, scopusAffiliationId, authorQuery)

        //push in whole array for now and flatten later
        succeededScopusPapers.push(simplifiedAuthorPapers)


      } catch (error) {
        const errorMessage = `Error on get scopus papers for author: ${person.lastName}, ${person.firstName}: ${error}`
        failedScopusPapers.push(errorMessage)
        console.log(errorMessage)
      }
    }, {concurrency: 3})

    //flatten out succeedScopusPaperArray for data for csv and change scopus json object to string
    const outputScopusPapers = _.map(_.flatten(succeededScopusPapers), paper => {
      paper['source_metadata'] = JSON.stringify(paper['source_metadata'])
      return paper
    })

    //write data out to csv
    await writeCsv({
      path: `../data/scopus.${year}.${moment().format('YYYYMMDDHHmmss')}.csv`,
      data: outputScopusPapers,
    });
    console.log(`Total Succeeded Papers: ${outputScopusPapers.length}`)
    console.log(`Get error messages: ${JSON.stringify(failedScopusPapers,null,2)}`)

  }, { concurrency: 1 })
}
  main();
