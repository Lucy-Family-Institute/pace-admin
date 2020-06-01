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

// environment variables
process.env.NODE_ENV = 'development';

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
  // const baseUrl = `https://api-elsevier-com.proxy.library.nd.edu/content/abstract/scopus_id/${scopusId}`
  //const baseUrl = 'https://api.elsevier.com/content/article/eid/1-s2.0-S152500161830594X'
  //const baseUrl = `https://api.elsevier.com/content/article/eid/${eid}`
  // const baseUrl = `https://api.elsevier.com/content/article/pii/S1525-0016(18)30594-X`
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

async function main (): Promise<void> {

  const publications = await getPublications()
  const publicationsBySource = await _.groupBy(publications, (publication) => {
    return publication['source_name']
  })

  const abstracts = {}
  // load pubmed abstracts
  _.each(publicationsBySource['PubMed'], (publication) => {
    abstracts[publication['doi']] = publication['source_metadata']['description']
  })
  console.log(`Abstracts found for PubMed ${JSON.stringify(abstracts, null, 2)}`)

  //_.each(publicationsBySource['Scopus'], async (publication) => {
    const publication = publicationsBySource['Scopus'][0]
    const eid = publication.scopus_eid
    const pii = publication.scopus_pii
    const eidParts = eid.split('-')
    if (eidParts.length > 0) {
      // const scopusId = eidParts[eidParts.length - 1]
      const scopusId = '85059466526'
      const scopusAbstractData = await getScopusPaperAbstractData(pii)
      console.log(JSON.stringify(scopusAbstractData, null, 2))
    }
  //})
  // _.each(_.keys(abstracts), (doi) => {
  //   if (!abstracts[doi]){
  //     console.log(`Found Doi with null abstract: ${doi}`)
  //   } else {
  //     console.log('Found doi with existing abstract')
  //     console.log(`Writing abstract for doi: ${doi} abstract: ${abstracts[doi]}`)
  //     const resultUpdatePubAbstracts = client.mutate(updatePubAbstract(doi, abstracts[doi]))
  //     console.log(`Returned result: ${resultUpdatePubAbstracts}`)
  //   }
  // })

  // insert abstracts from PubMed
  // const dois = _.keys(abstracts)
  const doi = '10.1002/ijc.24347'

  // console.log(`Writing abstract for doi: ${doi} abstract: ${abstracts[doi]}`)
  // const resultUpdatePubAbstracts = await client.mutate(updatePubAbstract(doi, abstracts[doi]))
  // console.log(`Returned result: ${resultUpdatePubAbstracts.data}`)
  // // next grab abstracts from Scopus using the scopus id and call to content/abstract
  // then update DB by DOI and publication id
  // in UI display the abstract that exists from any source
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
