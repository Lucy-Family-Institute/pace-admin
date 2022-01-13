import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import pTimes from 'p-times'
import readPersonsByYearAllCenters from './gql/readPersonsByYearAllCenters'
import readPublicationsByPersonByConfidence from './gql/readPublicationsByPersonByConfidence'
import { command as loadCsv } from './units/loadCsv'
import { split } from 'apollo-link'
// import cslParser from './utils/cslParser'
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'
import dotenv from 'dotenv'
import resolve from 'path'
const xmlToJson = require('xml-js');
import { randomWait, wait } from './units/randomWait'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');
const WOS_USERNAME = process.env.WOS_USERNAME
const WOS_PASSWORD = process.env.WOS_PASSWORD
const WOS_API_LITE_KEY = process.env.WOS_API_LITE_KEY

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
// const config = require('../config/config.js');

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

// return the session id
async function wosAuthenticate() {
  const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WOKMWSAuthenticate'
  //encode authstring in base64, need to send as bytes, not character
  const authString = `${WOS_USERNAME}:${WOS_PASSWORD}`
  console.log(`auth info: ${authString}`)
  const authB64 = Buffer.from(authString).toString('base64')

  let soapAuthenticate = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\
                            xmlns:auth="http://auth.cxf.wokmws.thomsonreuters.com">\
                            <soapenv:Header/>\
                            <soapenv:Body>\
                              <auth:authenticate/>\
                            </soapenv:Body>\
                          </soapenv:Envelope>'

  //sessionid=authenticationresponse.headers.get('Set-Cookie')
  const response = await axios.post(baseUrl, soapAuthenticate,
    {
      headers: {
        'Authorization': `Basic ${authB64}`,
        'SOAPAction': '',
        'content-type' : 'text/xml;charset=UTF-8'
      }
    }
  ).catch(err=>{console.log(err)})
  let cookie = response.headers['set-cookie'][0]
  // if (_.startsWith(cookie, 'SID=')) {
  //   cookie = cookie.substr(4)
  // }
  // console.log(cookie)
  return cookie
}

function getWoSRESTQueryString(authorFamilyName, authorGivenName) {
  // update to search on all name variations
  const query = `AU = (${authorFamilyName}, ${authorGivenName})`
  return query
}

function getWoSQuerySOAPString(authorFamilyName, authorGivenName) {
  let soapquery = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\
                    xmlns:woksearchlite="http://woksearchlite.v3.wokmws.thomsonreuters.com">\
                    <soapenv:Header/>\
                    <soapenv:Body>\
                      <woksearchlite:search>\
                        <queryParameters>\
                            <databaseId>WOS</databaseId>\
                            <userQuery>AU = (${authorFamilyName}, ${authorGivenName}) AND OG = (University of Notre Dame) </userQuery>\
                            <editions>\
                              <collection>WOS</collection>\
                              <edition>SCI</edition>\
                            </editions>\
                            <timeSpan>\
                              <begin>2020-01-01</begin>\
                              <end>2020-12-31</end>\
                            </timeSpan>\
                            <queryLanguage>en</queryLanguage>\
                        </queryParameters>\
                        <retrieveParameters>\
                            <firstRecord>1</firstRecord>\
                            <count>0</count>\
                        </retrieveParameters>\
                      </woksearchlite:search>\
                    </soapenv:Body>\
                  </soapenv:Envelope>`
  return soapquery
}

function getWoSRetrieveRecordString(queryId, offset, limit) {
  let soapRetrieve = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\
                        <soap:Body>\
                          <ns2:retrieve xmlns:ns2="http://woksearchlite.v3.wokmws.thomsonreuters.com">\
                            <queryId>${queryId}</queryId>\
                            <retrieveParameters>\
                              <firstRecord>${offset}</firstRecord>\
                              <count>${limit}</count>\
                            </retrieveParameters>\
                          </ns2:retrieve>\
                        </soap:Body>\
                      </soap:Envelope>`
  // console.log(`soap string is: ${soapRetrieve}`)
  return soapRetrieve
}

async function getWoSAuthorDataREST(authorFamilyName, authorGivenName) {
  const WOS_API_URL = 'https://wos-api.clarivate.com/api/wos'
  const WOS_API_LITE_URL = 'https://wos-api.clarivate.com/api/woslite'
  const baseUrl = WOS_API_LITE_URL
  const count = 100
  const db = 'WOS'
  let firstRecord = 1
  const userQuery = getWoSRESTQueryString(authorFamilyName, authorGivenName)
  const query = {'databaseId': db, 'usrQuery': userQuery, 'count': count,
                     'firstRecord': firstRecord}
  const response = await axios.get(baseUrl, {
    headers: {
      'X-ApiKey' : WOS_API_LITE_KEY,
      'Accept': 'application/json'
    },
    params: {
      query : 'Smith' //query
    }
  });
  console.log(`WoS REST query response: ${response}}`)
  return response.data
}

async function getWoSAuthorData(sessionId, authorFamilyName, authorGivenName) { //, year, scopusAffiliationId, pageSize, offset){
  //const baseUrl = 'https://api.elsevier.com/content/search/scopus'

  // const authorQuery = "AUTHFIRST("+ authorGivenName +") and AUTHLASTNAME("+ authorFamilyName+") and AF-ID(" + scopusAffiliationId + ")"

  const soapQueryString = getWoSQuerySOAPString(authorFamilyName, authorGivenName)
  const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
  const response = await axios.post(baseUrl, soapQueryString,
    {
      headers: {
        'Cookie': sessionId,
        'content-type' : 'application/json'// 'text/xml;charset=UTF-8'
      }
    }
  ).catch(err=>{console.log(err)})
  // console.log(response)
  const jsonData =  xmlToJson.xml2js(response.data, {compact:true});
  // console.log(`Found Query Data as xml for ${authorFamilyName}, ${authorGivenName}: ${JSON.stringify(response.data, null, 2)}`)
  // console.log(`Found Query Data as json for ${authorFamilyName}, ${authorGivenName}: ${JSON.stringify(jsonData, null, 2)}`)
  return jsonData
}

async function retrieveWoSAuthorResults(sessionId, queryId, offset) {
  const soapRetrieveString = getWoSRetrieveRecordString(queryId, offset, 100)
  // console.log(`Retrieve soap string is: ${soapRetrieveString}`)
  const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
  const response = await axios.post(baseUrl, soapRetrieveString,
    {
      headers: {
        'Cookie': sessionId,
        'content-type' : 'application/json'// 'text/xml;charset=UTF-8'
      }
    }
  ).catch(err=>{console.log(err)})
  // console.log(response)
  const jsonData =  xmlToJson.xml2js(response.data, {compact:true});
  // console.log(`Found Query Data as xml: ${JSON.stringify(response.data, null, 2)}`)
  // console.log(`Found Query Data as json: ${JSON.stringify(jsonData, null, 2)}`)
  // console.log(`Found Query Data as json keys: ${JSON.stringify(_.keys(jsonData['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records), null, 2)}`)
  return jsonData
}

async function getWoSRESTAuthorPapers(authorFamilyName, authorGivenName) {
  console.log('here')
  const authorData = await getWoSAuthorDataREST(authorFamilyName, authorGivenName)
  console.log(`Author data for ${authorFamilyName}, ${authorGivenName} is: ${authorData}`)
  return authorData
}

async function getWoSAuthorPapers(sessionId, authorFamilyName, authorGivenName) {
  const pageSize = 100
  let offset = 1

  const authorData = await getWoSAuthorData(sessionId, authorFamilyName, authorGivenName)
  // console.log(`Author data: ${JSON.stringify(authorData, null, 2)}`)
  const queryId = authorData['soap:Envelope']['soap:Body']['ns2:searchResponse'].return.queryId._text
  const recordsFound = authorData['soap:Envelope']['soap:Body']['ns2:searchResponse'].return.recordsFound._text
  console.log(`Total Records for Author - ${authorFamilyName}, ${authorGivenName}: ${recordsFound}`)
  await wait(1500)
  let numberOfRequests = parseInt(`${recordsFound / pageSize}`)
  // check for a remainder
  if (recordsFound % pageSize > 0) {
    // add one more
    numberOfRequests += 1
  }
  //loop to get the result of the results
  console.log(`Making ${numberOfRequests} requests for ${authorFamilyName}, ${authorGivenName}`)
  let papers = []
  await pTimes (numberOfRequests, async function (index) {
    randomWait(index)
    const results = await retrieveWoSAuthorResults(sessionId, queryId, offset)
    // console.log(`First record is: ${JSON.stringify(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records[0], null, 2)}`)
    offset += pageSize
    if (!Array.isArray(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records)){
      // not returned as array if only one
      papers.push(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records)
    } else {
      _.each(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records, (record) => {
        // console.log(record['title']['value']['_text'])
        papers.push(record)
      })
    }
  }, { concurrency: 1})
  return papers
}

async function getWoSPaperData(doi){
  // const baseUrl = 'https://api.elsevier.com/content/search/scopus'

  // const affiliationId = "60021508"

  // //const authorQuery = (query) {
  // //  return {
  // //    "AF-ID("+ affiliationId + ")"
  // //  }
  // //}
  // const doiQuery = "DOI(" + doi + ")"

  // const response = await axios.get(baseUrl, {
  //     headers: {
  //       //'X-ELS-APIKey' : elsApiKey,
  //     },
  //     params: {
  //       query : doiQuery
  //     }
  //   });

  //   return response.data;

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
  const queryResult = await client.query(readPersonsByYearAllCenters(year))

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: _.lowerCase(person.family_name),
      firstInitial: _.lowerCase(person.given_name[0]),
      firstName: _.lowerCase(person.given_name),
      nameVariances: person.persons_namevariances,
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

// //does multiple requests against scopus search to get all papers for a given author name for a given year
// //returns a map of papers with paper scopus id mapped to the paper metadata
// async function getScopusAuthorPapers(person, year, scopusAffiliationId) {

//   try {
//     let searchPageResults = []
//     //set request set size
//     const pageSize = 25
//     let offset = 0

//     //get first page of results, do with first initial for now
//     const authorSearchResult = await getScopusAuthorData(person.firstInitial, person.lastName, year, scopusAffiliationId, pageSize, offset)
//     //console.log(`Author Search Result first page: ${JSON.stringify(authorSearchResult,null,2)}`)
//     if (authorSearchResult && authorSearchResult['search-results']['opensearch:totalResults']){
//       const totalResults = parseInt(authorSearchResult['search-results']['opensearch:totalResults'])
//       console.log(`Author Search Result Total Results: ${totalResults}`)
//       if (totalResults > 0 && authorSearchResult['search-results']['entry']){
//         //console.log(`Author ${person.lastName}, ${person.firstName} adding ${authorSearchResult['search-results']['entry'].length} results`)
//         searchPageResults.push(authorSearchResult['search-results']['entry'])
//         if (totalResults > pageSize){
//           let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
//           //if no remainder subtract one since already did one call
//           if ((totalResults % pageSize) <= 0) {
//             numberOfRequests -= 1
//           }
//           //loop to get the result of the results
//           console.log(`Making ${numberOfRequests} requests for ${person.lastName}, ${person.firstName}`)
//           await pTimes (numberOfRequests, async function (index) {
//             randomWait(index)
//             if (offset + pageSize < totalResults){
//               offset += pageSize
//             } else {
//               offset += totalResults - offset
//             }
//             const authorSearchResultNext = await getScopusAuthorData(person.firstInitial, person.lastName, year, scopusAffiliationId, pageSize, offset)

//             if (authorSearchResultNext['search-results']['entry']) {
//               //console.log(`Getting Author Search Result page ${index+2}: ${authorSearchResultNext['search-results']['entry'].length} objects`)
//               searchPageResults.push(authorSearchResultNext['search-results']['entry'])
//             }
//           }, { concurrency: 3})
//         } else {
//           console.log(`Author Search Result Total Results: ${totalResults}`)
//         }
//       }
//     }

//     //flatten the search results page as currently results one per page, and then keyBy scopus id
//     return _.flattenDepth(searchPageResults, 1)
//   } catch (error) {
//     console.log(`Error on get info for person: ${error}`)
//   }
// }

//takes an array of objects of form [element 1, element 2] where
// element is of form {"label": {_text: "property_name"}, "value": {actual_value}}
// to form [property_name:actual_value]
function getWoSMapLabelsToValues(properties) {
  let transformedProperties = {}
  _.each(properties, (property) => {
    transformedProperties[property['label']['_text']] = property['value']
  })
  return transformedProperties
}

//
// Takes in an array of scopus records and returns a hash of scopus id to object:
// 'year', 'title', 'journal', 'doi', 'scopus_id', 'scopus_record'
//
// scopus_record is the original json object
function getSimplifliedWoSPapers(papers, searchFamilyName, searchGivenName){
  return _.map(papers, (paper) => {
    const otherProps = getWoSMapLabelsToValues(paper['other'])
    const sourceProps = getWoSMapLabelsToValues(paper['source'])
    return {
      search_family_name : searchFamilyName,
      search_given_name : searchGivenName,
      title: paper['title'] && paper['title']['value'] && paper['title']['value']['_text'] ? paper['title']['value']['_text'] : '',
      journal: sourceProps && sourceProps['SourceTitle'] && sourceProps['SourceTitle']['_text'] ? sourceProps['SourceTitle']['_text'] : '',
      publication_year: sourceProps && sourceProps['Published.BiblioYear'] && sourceProps['Published.BiblioYear']['_text'] ? sourceProps['Published.BiblioYear']['_text'] : '',
      doi: otherProps && otherProps['Identifier.Doi'] && otherProps['Identifier.Doi']['_text'] ? otherProps['Identifier.Doi']['_text'] : '',
      wos_id: paper['uid'] && paper['uid']['_text'] ? _.replace(paper['uid']['_text'], 'WOS:', '') : '',
      wos_record : paper
    }
  })
}

async function main (): Promise<void> {
  const sessionId = await wosAuthenticate()
  // const authorData = await getWoSAuthorData(sessionId, 'Aprahamian', 'Ani')
  // const queryId = authorData['soap:Envelope']['soap:Body']['ns2:searchResponse'].return.queryId._text
  // const results = await retrieveWoSAuthorResults(sessionId, queryId, 1)
  // _.each(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records, (record) => {
  //   console.log(record['title']['value']['_text'])
  // })
  const years = [ 2020 ]
  // const scopusAffiliationId = "60021508"
  let succeededPapers = []
  let failedPapers = []
  let succeededAuthors = []
  let failedAuthors = []
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    // get short list of ones with errors w/ 2020 only
    // let personWithHarvestErrors = _.filter(simplifiedPersons, (person) => {
    //   const erroredPersonIds = [95, 54, 31, 92, 63, 97]
    //   return _.includes(erroredPersonIds, person.id)
    // })

    // console.log(`Person with harvest errors for ${year} are: ${JSON.stringify(personWithHarvestErrors,null,2)}`)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons.length,null,2)}`)


    let personCounter = 0

    const subset = _.chunk(simplifiedPersons, 1)
    // await pMap(personWithHarvestErrors, async (person) => {
    await pMap(simplifiedPersons, async (person) => {
      try {
        personCounter += 1
        console.log(`Getting papers for ${person.lastName}, ${person.firstName}`)
        // run for each name plus name variance, put name variance second in case undefined
        let searchNames = _.concat([{given_name: person.firstName, family_name: person.lastName }], person.nameVariances)
        
        await pMap(searchNames, async (searchName) => {
          await wait(1500)
          // console.log(`Finished wait Getting papers for ${person.lastName}, ${person.firstName}`)
          const records = await getWoSAuthorPapers(sessionId, searchName.family_name, searchName.given_name)
          //const records = await getWoSRESTAuthorPapers(person.lastName, person.firstName)
          const simplifiedPapers = getSimplifliedWoSPapers(records, searchName.family_name, searchName.given_name)
          // console.log(`simplified papers are: ${JSON.stringify(simplifiedPapers, null, 2)}`)
          //push in whole array for now and flatten later
          succeededPapers.push(simplifiedPapers)

          // now do with just first initial
          await wait(1500)
          // console.log(`Finished wait Getting papers for ${person.lastName}, ${person.firstName}`)
          const records2 = await getWoSAuthorPapers(sessionId, searchName.family_name, searchName.given_name[0])
          //const records = await getWoSRESTAuthorPapers(person.lastName, person.firstName)
          const simplifiedPapers2 = getSimplifliedWoSPapers(records2, searchName.family_name, searchName.given_name[0])
          // console.log(`simplified papers are: ${JSON.stringify(simplifiedPapers, null, 2)}`)
          //push in whole array for now and flatten later
          succeededPapers.push(simplifiedPapers2)
        }, { concurrency: 1})
        succeededAuthors.push(person)
      } catch (error) {
        const errorMessage = `Error on get WoS papers for author: ${person.lastName}, ${person.firstName}: ${error}`
        failedPapers.push(errorMessage)
        failedAuthors.push(person)
        console.log(errorMessage)
      }
    }, {concurrency: 1})

  
    //flatten out succeedPaperArray for data for csv and change WoS json object to string
    const outputPapers = _.map(_.flatten(succeededPapers), paper => {
      paper['wos_record'] = JSON.stringify(paper['wos_record'])
      return paper
    })

    const batchSize = 200
    const batches = _.chunk(outputPapers, batchSize)

    await pMap(batches, async (batch, index) => {
      //write data out to csv
      //console.log(outputScopusPapers)
      await writeCsv({
        path: `../data/wos.${year}.${moment().format('YYYYMMDDHHmmss')}_${index}.csv`,
        data: batch,
      });
      console.log(`Total Succeeded Papers: ${batch.length}`)
      console.log(`Total Succeeded Authors: ${succeededAuthors.length}`)
      console.log(`Total Failed Authors: ${failedAuthors.length}`)
      console.log(`Get error messages: ${JSON.stringify(failedPapers,null,2)}`)
    }, { concurrency: 1 } )
  }, { concurrency: 1 })
  }

  main();
