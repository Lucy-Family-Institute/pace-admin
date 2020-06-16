import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPersons from '../client/src/gql/readPersons'
import readPublications from './gql/readPublications'
import updatePubAbstract from './gql/updatePubAbstract'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const axios = require('axios');

const elsApiKey = process.env.SCOPUS_API_KEY
const elsCookie = process.env.SCOPUS_API_COOKIE

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

async function getAllSimplifiedPersons () {
  const queryResult = await client.query(readPersons())

  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: person.family_name.toLowerCase(),
      firstInitial: person.given_name[0].toLowerCase(),
      firstName: person.given_name.toLowerCase(),
      startYear: person.start_date,
      endYear: person.end_date
    }
  })
  return simplifiedPersons
}

function getNameKey (lastName, firstName) {
  return `${_.toLower(lastName)}, ${_.toLower(firstName)}`
}

async function getScopusPaperAbstractData (pii) {
  const baseUrl = `https://api.elsevier.com/content/article/pii/${pii}`
  console.log(`Base url is: ${baseUrl}`)

  const response = await axios.get(baseUrl, {
    headers: {
      'httpAccept' : 'text/xml',
      'X-ELS-APIKey' : elsApiKey,
      'Cookie': elsCookie
    },
    withCredentials: true
  });

  //console.log(response.data)
  return response.data;
}

async function getPublications () {
  const queryResult = await client.query(readPublications())
  return queryResult.data.publications
}

async function getScopusDataFromCsv (csvPath) {
  console.log(`Loading Scopus Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const scopusPapers: any = await loadCsv({
     path: csvPath
    })

    const papersByDoi = _.groupBy(scopusPapers, (paper) => {
      return paper['doi']
    })

    return papersByDoi
  } catch (error) {
    console.log (`Error on load csv: ${csvPath}`)
  }
}

async function main (): Promise<void> {

  const publications = await getPublications()
  const publicationsBySource = await _.groupBy(publications, (publication) => {
    return publication['source_name']
  })

  const pubMedAbstracts = {}
  // load pubmed abstracts
  _.each(publicationsBySource['PubMed'], (publication) => {
    pubMedAbstracts[publication['doi']] = publication['source_metadata']['description']
  })
  console.log(`Abstracts found for PubMed ${JSON.stringify(_.keys(pubMedAbstracts).length, null, 2)}`)

  const scopusDataFile = '../data/scopus_full_metadata.20200602154048.csv'
  const scopusDataByDoi = await getScopusDataFromCsv(scopusDataFile)
  const scopusAbstracts = {}
  console.log(`Abstracts found for Scopus: ${JSON.stringify(_.keys(scopusDataByDoi).length, null, 2)}`)
  _.each(_.keys(scopusDataByDoi), (doi) => {
    const scopusData = scopusDataByDoi[doi]
    const abstract = scopusData['abstract']
    scopusAbstracts[doi] = abstract
  })

  // write abstracts from PubMed
  _.each(_.keys(pubMedAbstracts), (doi) => {
    if (!pubMedAbstracts[doi]){
      console.log(`Found Doi with null abstract: ${doi}`)
    } else {
      console.log('Found doi with existing abstract')
      console.log(`Writing abstract for doi: ${doi} abstract: ${pubMedAbstracts[doi]}`)
      const resultUpdatePubAbstracts = client.mutate(updatePubAbstract(doi, pubMedAbstracts[doi]))
      console.log(`Returned result pubmed: ${resultUpdatePubAbstracts}`)
    }
  })

  // write scopus abstracts
  _.each(_.keys(scopusAbstracts), (doi) => {
    if (!scopusAbstracts[doi]){
      console.log(`Found Doi with null abstract: ${doi}`)
    } else {
      console.log('Found doi with existing abstract')
      console.log(`Writing abstract for doi: ${doi} abstract: ${pubMedAbstracts[doi]}`)
      const resultUpdatePubAbstracts = client.mutate(updatePubAbstract(doi, scopusAbstracts[doi]))
      console.log(`Returned result scopus: ${resultUpdatePubAbstracts}`)
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
