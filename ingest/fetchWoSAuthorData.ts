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
const xmlToJson = require('xml-js');
import { randomWait } from './units/randomWait'

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
                              <begin>2015-01-01</begin>\
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

async function getWoSAuthorData(sessionId, authorFamilyName, authorGivenName) {

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
  const jsonData =  xmlToJson.xml2js(response.data, {compact:true});
  return jsonData
}

async function retrieveWoSAuthorResults(sessionId, queryId, offset) {
  const soapRetrieveString = getWoSRetrieveRecordString(queryId, offset, 100)
  const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
  const response = await axios.post(baseUrl, soapRetrieveString,
    {
      headers: {
        'Cookie': sessionId,
        'content-type' : 'application/json'// 'text/xml;charset=UTF-8'
      }
    }
  ).catch(err=>{console.log(err)})
  const jsonData =  xmlToJson.xml2js(response.data, {compact:true});
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
  await randomWait(1500)
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
    offset += pageSize
    _.each(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records, (record) => {
      papers.push(record)
    })
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
function getSimplifliedWoSPapers(papers, simplifiedPerson){
  return _.map(papers, (paper) => {
    const otherProps = getWoSMapLabelsToValues(paper['other'])
    const sourceProps = getWoSMapLabelsToValues(paper['source'])
    return {
      search_family_name : simplifiedPerson.lastName,
      search_given_name : simplifiedPerson.firstInitial,
      title: paper['title'] && paper['title']['value'] && paper['title']['value']['_text'] ? paper['title']['value']['_text'] : '',
      journal: sourceProps && sourceProps['SourceTitle'] && sourceProps['SourceTitle']['_text'] ? sourceProps['SourceTitle']['_text'] : '',
      doi: otherProps && otherProps['Identifier.Doi'] && otherProps['Identifier.Doi']['_text'] ? otherProps['Identifier.Doi']['_text'] : '',
      wos_id: _.replace(paper['uid']['_text'], 'WOS:', ''),
      wos_record : paper
    }
  })
}

async function main (): Promise<void> {
  const sessionId = await wosAuthenticate()
  const years = [ 2019, 2018, 2017, 2016 ]
  let succeededPapers = []
  let failedPapers = []
  let succeededAuthors = []
  let failedAuthors = []
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    let personCounter = 0

    const subset = _.chunk(simplifiedPersons, 1)
    await pMap(simplifiedPersons, async (person) => {
      try {
        personCounter += 1
        console.log(`Getting papers for ${person.lastName}, ${person.firstName}`)
        await randomWait(1500)
        const records = await getWoSAuthorPapers(sessionId, person.lastName, person.firstName)
        const simplifiedPapers = getSimplifliedWoSPapers(records, person)
        succeededPapers.push(simplifiedPapers)
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

    //write data out to csv
    //console.log(outputScopusPapers)
    await writeCsv({
      path: `../data/wos.${year}.${moment().format('YYYYMMDDHHmmss')}.csv`,
      data: outputPapers,
    });
    console.log(`Total Succeeded Papers: ${outputPapers.length}`)
    console.log(`Total Succeeded Authors: ${succeededAuthors.length}`)
    console.log(`Total Failed Authors: ${failedAuthors.length}`)
    console.log(`Get error messages: ${JSON.stringify(failedPapers,null,2)}`)

  }, { concurrency: 1 })

}

  main();
