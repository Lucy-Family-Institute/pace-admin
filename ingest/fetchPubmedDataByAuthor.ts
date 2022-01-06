const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const pMap = require('p-map');
const schema = require('schm');
const translate = require('schm-translate');
const xmlToJson = require('xml-js');

const getIds = require('./units/joinCsvs').command;

import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import moment from 'moment'
import dotenv from 'dotenv'
import resolve from 'path'
import fetch from 'node-fetch'
import readPersonsByYearAllCenters from '../client/src/gql/readPersonsByYearAllCenters'
import { randomWait, wait } from './units/randomWait'

dotenv.config({
  path: '../.env'
})

// environment variables
process.env.NODE_ENV = 'development';

const pubmedConfig = {
  baseUrl: process.env.PUBMED_BASE_URL,
  queryUrl: process.env.PUBMED_QUERY_URL,
  sourceName: process.env.PUBMED_SOURCE_NAME,
  publicationUrl: process.env.PUBMED_PUBLICATION_URL,
  pageSize: process.env.PUBMED_PAGE_SIZE,
  requestInterval: Number.parseInt(process.env.PUBMED_REQUEST_INTERVAL),
  memberFilePath: process.env.PUBMED_CENTER_MEMBER_FILE_PATH,
  awardFilePath: process.env.PUBMED_AWARD_FILE_PATH,
  dataFolderPath: process.env.PUBMED_DATA_FOLDER_PATH
}

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

const creatorSchema = schema({
  affiliation: {type: String, default: null},
  givenName: {type: String, default: null},
  familyName: {type: String, default: null},
  initials: {type: String, default: null},
}, translate({
  affiliation: 'AffiliationInfo.Affiliation._text',
  givenName: 'ForeName._text',
  familyName: 'LastName._text',
  initials: 'Initials._text'
}));

const resourceIdentifierSchema = schema({
  resourceIdentifierType: {type: String, default: null},
  resourceIdentifier: {type: String, default: null},
}, translate({
  resourceIdentifierType: '_attributes.IdType',
  resourceIdentifier: '_text',
}));

const funderIdentifierSchema = schema({
  funder: {type: String, default: null},
  country: {type: String, default: null},
  funderIdentifier: {type: String, default: null},
}, translate ({
  funder: 'Agency._text',
  country: 'Country._text',
  funderIdentifier: 'GrantID._text',
}));

const shareWorkSchema = schema({
  title: {type: String, default: null},
  publicationYear: {type: String, default: null},
  description: {type: String, default: null},
  creators: [creatorSchema],
  resourceIdentifiers: [resourceIdentifierSchema],
  funderIdentifiers: [funderIdentifierSchema],
}, translate({
  title: 'MedlineCitation.Article.ArticleTitle._text',
  publicationYear: 'MedlineCitation.Article.Journal.JournalIssue.PubDate.Year._text',
  description: 'MedlineCitation.Article.Abstract.AbstractText._text',
  creators: 'MedlineCitation.Article.AuthorList.Author',
  resourceIdentifiers: 'PubmedData.ArticleIdList.ArticleId',
  funderIdentifiers: 'MedlineCitation.Article.GrantList.Grant'
}));

async function getAwardPublications(awardId){
  const ids = await getESearch(awardId)
  const records = await getEFetch(ids)
  if(_.get(records, 'PubmedArticleSet.PubmedArticle', null)) {
    return extractMetadata(records)
  }
  return null;
}

async function getPersonPublications(person){
  const batchSize = 400
  const ids = await getPersonESearch(person)
  console.log(`Fetching papers for ${ids.length} ids`)
  const batches = _.chunk(ids, batchSize)
  let extractedMetadata = []
  let counter = 1
  await pMap(batches, async (batch) => {
    //const batch = batches[13]
    const start = ((counter-1) * batchSize)+1
    let end = batchSize * counter
    if (end > ids.length) end = ids.length
    console.log(`Fetching records batch (${start} to ${end}) of ${ids.length} records for ${person.lastName}, ${person.firstName}`)
    const records = await getEFetch(batch)
    // const records = await getEFetch(ids)
    if(_.get(records, 'PubmedArticleSet.PubmedArticle', null)) {
      extractedMetadata = _.concat(extractedMetadata, extractMetadata(records))
    }
    counter += 1
  }, { concurrency: 1 })
  return extractedMetadata
}

async function getESearch(term){
  await wait(1000)
  const url = pubmedConfig.queryUrl
  const response = await axios.get(url, {
    params: {
      db: 'pubmed',
      retmode: 'json',
      retmax: '100',
      term,
    }
  })
  return response.data.esearchresult.idlist
}

async function getEFetch(ids){
  await wait(1000)
  const url = pubmedConfig.publicationUrl
  const commaSeparatedIds = _.join(ids, ',')
  const response = await axios.get(url, {
    responseType: 'text',
    params: {
      db: 'pubmed',
      retmode: 'xml',
      retmax: '10000',
      id: commaSeparatedIds,
    }
  })
  return xmlToJson.xml2js(response.data, {compact:true})
}

async function getPersonESearch(person){
  await wait(1000)
  const personString = `${person['lastName']}, ${person['firstName']}`
  const term = `(Notre Dame[Affiliation]) AND (${person['lastName']}, ${person['firstName']}[Author] OR ${person['lastName']}, ${person['firstName']}[Investigator])` // OR ${person['lastName']} ${person['firstName']}[Author] OR ${person['lastName']} ${person['firstName']}[Investigator]`
  console.log(`Term is: ${term}`)
  const url = pubmedConfig.queryUrl;
  const response = await axios.get(url, {
    params: {
      db: 'pubmed',
      retmode: 'json',
      retmax: '10000',
      term,
    }
  })
  return response.data.esearchresult.idlist
}

function extractMetadata(rawJson){
  if (_.isArray(rawJson.PubmedArticleSet.PubmedArticle)) {
    return _.map(rawJson.PubmedArticleSet.PubmedArticle, (value,key)=> {
      return shareWorkSchema.parse(value)
    });
  } else {
    return shareWorkSchema.parse(rawJson.PubmedArticleSet.PubmedArticle)
  }
}

async function getFileData(filePath){
  //incomplete...
  fs.readFile('/etc/passwd', (err, data) => {
    if (err) throw err;
    console.log(data);
  })
}

async function getSimplifiedPersons(year) {
  const queryResult = await client.query(readPersonsByYearAllCenters(year))

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

async function main(): Promise<void> {
  // const awardIds = await getIds();
  // console.log(`Award ids are: ${JSON.stringify(awardIds, null, 2)}`)
  // const uniqueAwardIds = _.uniq(awardIds);
  // //let uniqueAwardIds = ['GM067079','CA212964'];
  // console.log(`Found ${awardIds.length} awards; ${uniqueAwardIds.length} unique`);

  // const mapper = async (awardId) => {
  //   console.log(`Working on ${awardId}`);
  //   const response = await getAwardPublications(awardId);
  //   const filename = path.join(process.cwd(), dataFolderPath, 'awards', `${awardId}.json`);
  //   if( response ) {
  //     console.log(`Writing ${filename}`);
  //     await pify(fs.writeFile)(filename, JSON.stringify(response));
  //   }
  // };
  // //actually run the method above to getAwardPublications against each awardId in the awardsIds array, timeout enabled to avoid exceeded request limit to PMC
  // const result = await pMap(uniqueAwardIds, mapper, {concurrency: 2});

  // now search by author list in the center


  const harvestYearStr = process.env.PUBMED_HARVEST_YEARS
  const harvestYearStrArr = _.split(harvestYearStr, ',')
  const harvestYears = _.map(harvestYearStrArr, (yearStr) => {
    return Number.parseInt(yearStr)
  })

  const years = harvestYears
  // const years = [ 2020 ]
  await pMap(years, async (year) => {
    const simplifiedPersons = await getSimplifiedPersons(year)
    console.log(`Simplified persons for ${year} are: ${JSON.stringify(simplifiedPersons,null,2)}`)

    //create map of last name to array of related persons with same last name
    // const personMap = _.transform(simplifiedPersons, function (result, value) {
    //   (result[value['lastName']] || (result[value['lastName']] = [])).push(value)
    // }, {})

    // get short list of ones with errors w/ 2020 only
    const personWithHarvestErrors = _.filter(simplifiedPersons, (person) => {
      // "Error on get pubmed papers for author: li, jun: Error: Request failed with status code 414",
      // "Error on get pubmed papers for author: liu, fang: Error: Request failed with status code 414",
      // "Error on get pubmed papers for author: liu, xin: Error: Request failed with status code 414",
      // "Error on get pubmed papers for author: lu, xin: Error: Request failed with status code 414",
      // "Error on get pubmed papers for author: taylor, richard: Error: Request failed with status code 414"
      const erroredPersonIds = [49, 52, 53, 54, 82]
      return _.includes(erroredPersonIds, person.id)
    })

    // console.log(`Person with harvest errors for ${year} are: ${JSON.stringify(personWithHarvestErrors,null,2)}`)


    console.log(`Loading Pubmed ${year} Publication Data`)
    //load data from pubmed
    let personCounter = 0
    let succeededPubmedPapers = []
    let failedPubmedPapers = []

    const personMapper = async (person) => {
      try {
        personCounter += 1
        randomWait(personCounter)

        console.log(`Working on Pubmed papers for ${person['lastName']}, ${person['firstName']}`)
        const response = await getPersonPublications(person)
        // console.log(`Response is: ${JSON.stringify(response, null, 2)}`)
        const pubmedByAuthorDir = path.join(process.cwd(), pubmedConfig.dataFolderPath, 'pubmedByAuthor')
        if (!fs.existsSync(pubmedByAuthorDir)){
          fs.mkdirSync(pubmedByAuthorDir);
        }

        const filename = path.join(process.cwd(), pubmedConfig.dataFolderPath, 'pubmedByAuthor', `${_.lowerCase(person['lastName'])}_${_.lowerCase(person['firstName'])}.json`)
        if (response) {
          console.log(`Writing ${filename}`)
          await pify(fs.writeFile)(filename, JSON.stringify(response))
          succeededPubmedPapers.push(response)
        }
      } catch (error) {
        const errorMessage = `Error on get pubmed papers for author: ${person['lastName']}, ${person['firstName']}: ${error}`
        failedPubmedPapers.push(errorMessage)
        console.log(errorMessage)
      }
    }

    // const simplifiedPersons2 = _.chunk(simplifiedPersons, 1)
    // console.log(`Simp 2: ${JSON.stringify(simplifiedPersons2, null, 2)}`)
    // const personResult = await pMap(personWithHarvestErrors, personMapper, {concurrency: 2});
    const personResult = await pMap(simplifiedPersons, personMapper, {concurrency: 3});
    console.log(`Succeeded pubmed papers ${JSON.stringify(succeededPubmedPapers.length, null, 2)}`)
    console.log(`Failed pubmed papers ${JSON.stringify(failedPubmedPapers, null, 2)}`)
  }, { concurrency: 1 })
}

main();
