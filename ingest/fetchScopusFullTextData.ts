import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import readPublications from './gql/readPublications'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'
import pMap from 'p-map'

dotenv.config({
  path: '../.env'
})

import { randomWait } from './units/randomWait'
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


async function getScopusPaperAbstractData (baseUrl) {
  const url = `${baseUrl}?apiKey=${elsApiKey}`
  const response = await axios.get(url, {
    headers: {
      'httpAccept' : 'text/xml',
      'X-ELS-APIKey' : elsApiKey,
      'Cookie': elsCookie
    },
    withCredentials: true
  });
  return response.data;
}

async function getScopusPaperAbstractDataByPii (pii) {
  const baseUrl = `https://api-elsevier-com.proxy.library.nd.edu/content/article/pii/${encodeURIComponent(pii).replace('(', '%28').replace(')', '%29')}`
  return getScopusPaperAbstractData(baseUrl)
}

async function getPublications () {
  const queryResult = await client.query(readPublications())
  return queryResult.data.publications
}

//
// Takes in an array of scopus records and returns a hash of scopus id to object:
// 'year', 'title', 'journal', 'doi', 'scopus_id', 'scopus_record'
//
// scopus_fulltext_record is the original json object
function getSimplifiedScopusPaper(scopusPaper){
  // get subjects
  const subjects = []
  let abstract = undefined
  if (scopusPaper['coredata']) {
    if (scopusPaper['coredata']['dcterms:subject']) {
      _.each (scopusPaper['coredata']['dcterms:subject'], (obj) => {
        if (obj['$']) {
          subjects.push(obj['$'])
        }
      })
    }
    if (scopusPaper['coredata']['dc:description']) {
      abstract = scopusPaper['coredata']['dc:description']
      // trim 'Abstract ' or 'Summary ' off the front
      if (_.startsWith(abstract, 'Abstract ')) {
        abstract = abstract.substr('Abstract '.length)
      } else if (_.startsWith(abstract, 'Summary ')) {
        abstract = abstract.substr('Summary '.length)
      }
    }
  }
  return {
    title: (scopusPaper['coredata'] && scopusPaper['coredata']['dc:title']) ? scopusPaper['coredata']['dc:title'] : '',
    journal: (scopusPaper['coredata'] && scopusPaper['coredata']['prism:publicationName']) ? scopusPaper['coredata']['prism:publicationName'] : '',
    doi: (scopusPaper['coredata'] && scopusPaper['coredata']['prism:doi']) ? scopusPaper['coredata']['prism:doi'] : '',
    eid: (scopusPaper['coredata'] && scopusPaper['coredata']['eid']) ? scopusPaper['coredata']['eid']: '',
    abstract: abstract ? abstract : '',
    subjects: subjects ? JSON.stringify(subjects) : '',
    // scopus_full_record : scopusPaper['coredata'] ? JSON.stringify(scopusPaper['coredata']) : ''
  }
}

async function main (): Promise<void> {

  const publications = await getPublications()
  const publicationsBySource = await _.groupBy(publications, (publication) => {
    return publication['source_name']
  })

  //const publication = publicationsBySource['Scopus'][0]
  const simplifiedScopusPapers = []
  let succeededScopusPapers = []
  let failedScopusPapers = []

  let paperCounter = 0
  await pMap(publicationsBySource['Scopus'], async (publication) => {

    try {
      paperCounter += 1
      randomWait(paperCounter)

      let scopusAbstractData = undefined
      const eid = publication.scopus_eid
      const piiParts = eid.split('-')
      const pii = piiParts[piiParts.length - 1]
      if (publication.scopus_pii) {
        const pii = publication.scopus_pii
        console.log(`${paperCounter}: Getting Scopus Metadata for ${publication.doi} pii: ${pii}`)
        scopusAbstractData = await getScopusPaperAbstractDataByPii(pii)
      }
      if (scopusAbstractData) {
        if (_.isArray(scopusAbstractData['full-text-retrieval-response'])){
          const simplifiedScopusPaper = getSimplifiedScopusPaper(scopusAbstractData['full-text-retrieval-response'][0])
          succeededScopusPapers.push(simplifiedScopusPaper)
        } else {
          const simplifiedScopusPaper = getSimplifiedScopusPaper(scopusAbstractData['full-text-retrieval-response'])
          succeededScopusPapers.push(simplifiedScopusPaper)
        }
      }
    } catch (error) {
      const errorMessage = `Error on get scopus papers for doi: ${publication.doi}: ${error}`
      failedScopusPapers.push(errorMessage)
      console.log(error)
    }
  }, {concurrency: 3})

  console.log(JSON.stringify(failedScopusPapers, null, 2))

  // write data out to csv
  await writeCsv({
    path: `../data/scopus_full_metadata.${moment().format('YYYYMMDDHHmmss')}.csv`,
    data: succeededScopusPapers,
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
