import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import readPublicationsWoutAbstract from './gql/readPublicationsWoutAbstract'
import readPublicationsWoutAbstractByYear from './gql/readPublicationsWoutAbstractByYear'
import updatePubAbstract from './gql/updatePubAbstract'
import { __EnumValue } from 'graphql'
import dotenv from 'dotenv'
import pMap from 'p-map'
import { randomWait } from './units/randomWait'

dotenv.config({
  path: '../.env'
})

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

async function getPublications (startYear?) {
  if (startYear) {
    const queryResult = await client.query(readPublicationsWoutAbstractByYear(startYear))
    return queryResult.data.publications
  } else {
    const queryResult = await client.query(readPublicationsWoutAbstract())
    return queryResult.data.publications
  }
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

  let startYear = 2020
  const publications = await getPublications(startYear)
  const publicationsBySource = await _.groupBy(publications, (publication) => {
    return publication['source_name']
  })

  const pubMedAbstracts = {}
  // load pubmed abstracts
  _.each(publicationsBySource['PubMed'], (publication) => {
    pubMedAbstracts[publication['doi']] = publication['source_metadata']['description']
  })
  console.log(`Abstracts found for PubMed ${JSON.stringify(_.keys(pubMedAbstracts).length, null, 2)}`)

  const scopusDataFile = '../data/scopus_full_metadata.20210221082710.csv'
  const scopusDataByDoi = await getScopusDataFromCsv(scopusDataFile)
  const scopusAbstracts = {}
  console.log(`Abstracts found for Scopus: ${JSON.stringify(_.keys(scopusDataByDoi).length, null, 2)}`)
  _.each(_.keys(scopusDataByDoi), (doi) => {
    const scopusData = scopusDataByDoi[doi]
    const abstract = scopusData['abstract']
    scopusAbstracts[doi] = abstract
  })

  // write abstracts from PubMed
  let counter = 0
  await pMap(_.keys(pubMedAbstracts), async (doi) => {
    counter += 1
    randomWait(counter)
    if (pubMedAbstracts[doi]){
      // console.log('Found doi with existing abstract')
      console.log(`Writing abstract for doi: ${doi}`)
      const resultUpdatePubAbstracts = client.mutate(updatePubAbstract(doi, pubMedAbstracts[doi]))
    }
  }, { concurrency: 5})

  counter = 0
  // write scopus abstracts
  await pMap(_.keys(scopusAbstracts), async (doi) => {
    counter += 1
    randomWait(counter)
    if (scopusAbstracts[doi]){
      // console.log('Found doi with existing abstract')
      console.log(`Writing abstract for doi: ${doi}`)
      const resultUpdatePubAbstracts = await client.mutate(updatePubAbstract(doi, scopusAbstracts[doi]))
    }
  }, { concurrency: 5})
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
