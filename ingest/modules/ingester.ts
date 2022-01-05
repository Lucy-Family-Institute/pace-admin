import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import BibTex from './bibTex'
import { Mutex } from '../units/mutex'
import Cite from 'citation-js'
import Csl from './csl'
import pMap from 'p-map'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory'
import { getAllNormedPersons } from './queryNormalizedPeople'
import { CalculateConfidence } from './calculateConfidence'
import insertPublication from '../gql/insertPublication'
import insertPersonPublication from '../gql/insertPersonPublication'
import insertPubAuthor from '../gql/insertPubAuthor'
import readPublicationsByDoi from '../gql/readPublicationsByDoi'
import readPublicationsBySourceId from '../gql/readPublicationsBySourceId'
import readPublicationsByTitle from '../gql/readPublicationsByTitle'
import { randomWait } from '../units/randomWait'

import _ from 'lodash'
import IngesterConfig from './ingesterConfig'
import DataSourceConfig from './dataSourceConfig'
import { PubMedDataSource } from './pubmedDataSource'
import { SemanticScholarDataSource } from './semanticScholarDataSource'
import { WosDataSource } from './wosDataSource'
const getIngestFilePaths = require('../getIngestFilePaths');

interface MatchedPerson {
  person: any; // TODO: What is this creature?
  confidence: number;
}

export class Ingester {
    client: ApolloClient<NormalizedCacheObject>
    normedPersons: Array<NormedPerson>
    confirmedAuthorsByDoi: {}
    calculateConfidence: CalculateConfidence
    mutex: Mutex
    config: IngesterConfig
    pubmedDS: PubMedDataSource
    semanticScholarDS: SemanticScholarDataSource
    wosDS: WosDataSource
  
    constructor (config: IngesterConfig, client: ApolloClient<NormalizedCacheObject>) {
      this.config = config
      this.client = client
      this.calculateConfidence = new CalculateConfidence()
      this.mutex = new Mutex()
      const pubmedConfig : DataSourceConfig = {
        baseUrl: process.env.PUBMED_BASE_URL,
        queryUrl: process.env.PUBMED_QUERY_URL,
        sourceName: process.env.PUBMED_SOURCE_NAME,
        publicationUrl: process.env.PUBMED_PUBLICATION_URL,
        pageSize: process.env.PUBMED_PAGE_SIZE,
        requestInterval: Number.parseInt(process.env.PUBMED_REQUEST_INTERVAL)
      }
      this.pubmedDS = new PubMedDataSource(pubmedConfig)
      
      const semanticScholarConfig : DataSourceConfig = {
        baseUrl: process.env.SEMANTIC_SCHOLAR_BASE_URL,
        authorUrl: process.env.SEMANTIC_SCHOLAR_AUTHOR_URL,
        queryUrl: process.env.SEMANTIC_SCHOLAR_QUERY_URL,
        sourceName: process.env.SEMANTIC_SCHOLAR_SOURCE_NAME,
        publicationUrl: process.env.SEMANTIC_SCHOLAR_PUBLICATION_URL,
        pageSize: process.env.SEMANTIC_SCHOLAR_PAGE_SIZE,
        requestInterval: Number.parseInt(process.env.SEMANTIC_SCHOLAR_REQUEST_INTERVAL)
      }
      this.semanticScholarDS = new SemanticScholarDataSource(semanticScholarConfig)
      
      const wosConfig : DataSourceConfig = {
        baseUrl: process.env.WOS_BASE_URL,
        queryUrl: process.env.WOS_QUERY_URL,
        sourceName: process.env.WOS_SOURCE_NAME,
        userName: process.env.WOS_USERNAME,
        password: process.env.WOS_PASSWORD,
        pageSize: process.env.WOS_PAGE_SIZE,
        requestInterval: Number.parseInt(process.env.WOS_REQUEST_INTERVAL)
      }
      this.wosDS = new WosDataSource(wosConfig)
      
    }

    async initializeNormedPersons() {
      // include mutex to make sure this is thread-safe and not initialized simultaneously by multiple threads
      await this.mutex.dispatch( async () => {
        if (!this.normedPersons) {
          this.normedPersons = await getAllNormedPersons(this.client)
        }
      })
    }

    async initializeConfirmedAuthors() {
      await this.mutex.dispatch( async () => {
        if (!this.confirmedAuthorsByDoi) {
          let confirmedAuthorsByDoiByYear = new Map()
          const pathsByYear = await getIngestFilePaths("../config/ingestConfidenceReviewFilePaths.json")

          await pMap(_.keys(pathsByYear), async (year) => {
            console.log(`Loading ${year} Confirmed Authors`)
            //load data
            await pMap(pathsByYear[year], async (path) => {
              confirmedAuthorsByDoiByYear[year] = await this.calculateConfidence.getConfirmedAuthorsByDoiFromCSV(path)
            }, { concurrency: 1})
          }, { concurrency: 1 })
    
          // combine the confirmed author lists together
          this.confirmedAuthorsByDoi = new Map()
          _.each(_.keys(confirmedAuthorsByDoiByYear), (year) => {
            _.each(_.keys(confirmedAuthorsByDoiByYear[year]), (doi) => {
              this.confirmedAuthorsByDoi[doi] = _.concat((this.confirmedAuthorsByDoi[doi] || []), _.values(confirmedAuthorsByDoiByYear[year][doi]))
            })
          })
        }
      })
    }

    async getCSLAuthorsFromSourceMetadata(sourceName, sourceMetadata) {
      if (sourceName === 'SemanticScholar') {
        return this.semanticScholarDS.getCSLStyleAuthorList(sourceMetadata)    
      } else if (sourceName === 'WebOfScience') {
        return this.wosDS.getCSLStyleAuthorList(sourceMetadata)    
      } else if (sourceName === 'PubMed'){
        return this.pubmedDS.getCSLStyleAuthorList(sourceMetadata)
      } else {
        return []
      }
    }

    async insertPublicationAndAuthors (title, doi, csl, authors, sourceName, sourceId, sourceMetadata, minPublicationYear?) {
      //console.log(`trying to insert pub: ${JSON.stringify(title,null,2)}, ${JSON.stringify(doi,null,2)}`)
      try  {
        const publicationYear = Csl.getPublicationYear (csl)
        if (minPublicationYear != undefined && publicationYear < minPublicationYear) {
          console.log(`Skipping adding publication from year: ${publicationYear}`)
          return
        }
    
        const publication = {
          title: title,
          doi: doi,
          year: publicationYear,
          csl: csl,  // put these in as JSONB
          source_name: sourceName,
          source_id: sourceId,
          source_metadata: sourceMetadata, // put these in as JSONB,
          csl_string: JSON.stringify(csl)
        }
        // console.log(`Writing publication: ${JSON.stringify(publication, null, 2)}`)
        const mutatePubResult = await this.client.mutate(
          //for now convert csl json object to a string when storing in DB
          insertPublication ([publication])
        )
        const publicationId = 0+parseInt(`${ mutatePubResult.data.insert_publications.returning[0].id }`);
        // console.log(`Added publication with id: ${ publicationId }`)
    
        const insertAuthors = _.map(authors, (author) => {
          return {
            publication_id: publicationId,
            family_name: author.family,
            given_name: author.given,
            position: author.position
          }
        })
    
        try {
          const mutateFirstAuthorResult = await this.client.mutate(
            insertPubAuthor(insertAuthors)
          )
        } catch (error) {
          console.log(`Error on insert of Doi: ${doi} insert authors: ${JSON.stringify(insertAuthors,null,2)}`)
          console.log(error)
          throw error
        }
        return publicationId
      } catch (error){
        console.log(`Error on insert of Doi: ${doi} insert publication`)
        console.log(error)
        throw error
      }
    }

    async isPublicationAlreadyInDB (doi, sourceId, csl, sourceName) : Promise<boolean> {
      let foundPub = false
      const title = csl.title
      const publicationYear = Csl.getPublicationYear(csl)
      if (doi !== null){
        const queryResult = await this.client.query(readPublicationsByDoi(doi))
        // console.log(`Publications found for doi: ${doi}, ${queryResult.data.publications.length}`)
        if (queryResult.data.publications && queryResult.data.publications.length > 0){
          _.each(queryResult.data.publications, (publication) => {
            if (publication.doi && publication.doi !== null && _.toLower(publication.doi) === _.toLower(doi) && _.toLower(publication.source_name) === _.toLower(sourceName)) {
              foundPub = true
            }
          })
        }
      }
      if (!foundPub) {
        const querySourceIdResult = await this.client.query(readPublicationsBySourceId(sourceName, sourceId))
        // const authors = await getCSLAuthors(csl)
        // console.log(`Publications found for sourceId: ${sourceId}, ${querySourceIdResult.data.publications.length}`)
        _.each(querySourceIdResult.data.publications, (publication) => {
          // console.log(`checking publication for source id: ${sourceId}, publication: ${JSON.stringify(publication, null, 2)}`)
          if (_.toLower(publication.source_id) === _.toLower(sourceId) && _.toLower(publication.source_name) === _.toLower(sourceName)) {
            foundPub = true
          }
        })
      }
      if (!foundPub) {
        const titleQueryResult = await this.client.query(readPublicationsByTitle(title))
        _.each(titleQueryResult.data.publications, (publication) => {
          // console.log(`Checking existing publication title: '${publication.title}' year: '${JSON.stringify(publication.year)}' against title: '${title}' year: '${JSON.stringify(publicationYear)}' foundPub before is: ${foundPub}`)
          // check for something with same title and publication year as well
          if (publication.title === title && publication.year === publicationYear) { //} && authors.length === publication.publications_authors.length) {
            foundPub = true
          }
          // console.log(`Checking existing publication title: '${publication.title}' year: '${JSON.stringify(publication.year)}' against title: '${title}' year: '${JSON.stringify(publicationYear)}' foundPub after is: ${foundPub}`)
        })
      }
      return foundPub
    }

    // person map assumed to be a map of simplename to simpleperson object
    // author map assumed to be doi mapped to two arrays: first authors and other authors
    // returns a map of person ids to the person object and confidence value for any persons that matched coauthor attributes
    // example: {1: {person: simplepersonObject, confidence: 0.5}, 51: {person: simplepersonObject, confidence: 0.8}}
    async matchPeopleToPaperAuthors(publicationCSL, normedPersons, authors, confirmedAuthors, sourceName, sourceMetadata, minConfidence?) : Promise<Map<number,MatchedPerson>> {
    
      const calculateConfidence: CalculateConfidence = new CalculateConfidence()
      //match to last name
      //match to first initial (increase confidence)
      let matchedPersonMap = new Map()
    
      const confidenceTypesByRank = await calculateConfidence.getConfidenceTypesByRank()
       await pMap(normedPersons, async (normedPerson) => {
        
         //console.log(`Testing Author for match: ${author.family}, ${author.given}`)
    
          const passedConfidenceTests = await calculateConfidence.performAuthorConfidenceTests (normedPerson, publicationCSL.valueOf(), confirmedAuthors, confidenceTypesByRank, sourceName, sourceMetadata)
          // console.log(`Passed confidence tests: ${JSON.stringify(passedConfidenceTests, null, 2)}`)
          // returns a new map of rank -> confidenceTestName -> calculatedValue
          const passedConfidenceTestsWithConf = await calculateConfidence.calculateAuthorConfidence(passedConfidenceTests)
          // calculate overall total and write the confidence set and comments to the DB
          let confidenceTotal = 0.0
          _.mapValues(passedConfidenceTestsWithConf, (confidenceTests, rank) => {
            _.mapValues(confidenceTests, (confidenceTest) => {
              confidenceTotal += confidenceTest['confidenceValue']
            })
          })
          // set ceiling to 99%
          if (confidenceTotal >= 1.0) confidenceTotal = 0.99
          // have to do some weird conversion stuff to keep the decimals correct
          confidenceTotal = Number.parseFloat(confidenceTotal.toFixed(3))
          // console.log(`passed confidence tests are: ${JSON.stringify(passedConfidenceTestsWithConf, null, 2)}`)
          //check if persons last name in author list, if so mark a match
          //add person to map with confidence value > 0
          if (confidenceTotal > 0 && (!minConfidence || confidenceTotal >= minConfidence)) {
            // console.log(`Match found for Author: ${author.family}, ${author.given}`)
            let matchedPerson: MatchedPerson = { 'person': normedPerson, 'confidence': confidenceTotal }
            matchedPersonMap[normedPerson['id']] = matchedPerson
            //console.log(`After add matched persons map is: ${JSON.stringify(matchedPersonMap,null,2)}`)
          }
       }, { concurrency: 1 })
    
       //console.log(`After tests matchedPersonMap is: ${JSON.stringify(matchedPersonMap,null,2)}`)
      return matchedPersonMap
    }

    async ingest (publications: NormedPublication[], threadCount: number = 1, waitInterval: number = 1000) {
        // do for loop
        await pMap(publications, async (publication, index) => {
          await this.ingestNormedPublication(publication)
        }, { concurrency: 1 })
    }

    async ingestNormedPublication (normedPub: NormedPublication) {
      // only do something if the first call on this object
      await this.initializeNormedPersons()
      const testAuthors = this.normedPersons

      let csl: Csl = undefined
      try {
        csl = await NormedPublication.getCsl(normedPub)
      } catch (error) {
        console.log(`Throwing the error for doi: ${normedPub.doi}`)
        throw (error)
      }
      
      //retrieve the authors from the record and put in a map, returned above in array, but really just one element
      let authors = []
    
      if (csl) {
        // console.log(`Getting csl authors for doi: ${doi}`)
        authors = await Csl.getCslAuthors(csl)
      }
      // default to the confirmed author list if no author list in the csl record
      // console.log(`Before check csl is: ${JSON.stringify(csl, null, 2)} for doi: ${doi}`)
      // console.log(`Before check authors are: ${JSON.stringify(authors, null, 2)} for doi: ${doi}`)
      // now make sure confirmed authors are loaded
      await this.initializeConfirmedAuthors()
      if (authors.length <= 0 && csl && this.confirmedAuthorsByDoi[normedPub.doi] && _.keys(this.confirmedAuthorsByDoi[normedPub.doi]).length > 0) {
        authors = Csl.normedToCslAuthors(this.confirmedAuthorsByDoi[normedPub.doi])
        csl.setAuthors(authors)
      }
      // console.log(`Authors found: ${JSON.stringify(authors,null,2)}`)

      let sourceMetadata= csl.valueOf()
      let errorMessage = ''
      const types = [
        'manuscript',
        'article-journal',
        'article',
        'paper-conference',
        'chapter',
        'book',
        'peer-review',
        'report',
        'report-series'
      ]

      if (normedPub['sourceMetadata']) {
        sourceMetadata = normedPub.sourceMetadata
      }

      let publicationYear = undefined
      if (csl) {
        publicationYear = Csl.getPublicationYear (csl)
      } 

      // if at least one author, add the paper, and related personpub objects
      if(csl && _.includes(types, csl.valueOf()['type']) && csl.valueOf()['title']) {
        //push in csl record to jsonb blob

        //match paper authors to people
        //console.log(`Testing for Author Matches for DOI: ${doi}`)
        let matchedPersons = await this.matchPeopleToPaperAuthors(csl, testAuthors, authors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName, sourceMetadata, this.config.minConfidence)
        //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

        if (_.keys(matchedPersons).length <= 0){
          // try to match against authors from source if nothing found yet
          csl.setAuthors(await this.getCSLAuthorsFromSourceMetadata(normedPub.datasourceName, sourceMetadata))
          authors = csl.valueOf()['author']
          // console.log(`After check from source metadata if needed authors are: ${JSON.stringify(csl.author, null, 2)}`)
          if (csl.valueOf()['author'] && csl.valueOf()['author'].length > 0){
            matchedPersons = await this.matchPeopleToPaperAuthors(csl, testAuthors, authors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName, sourceMetadata, this.config.minConfidence)
          }
        }

        if (_.keys(matchedPersons).length > 0){
          const publicationYear = Csl.getPublicationYear (csl)
          await this.mutex.dispatch( async () => {
            const sourceId = normedPub.sourceId
            // reset doi if it is a placeholder
            let checkDoi = normedPub.doi
            if (_.toLower(normedPub.doi) === _.toLower(`${normedPub.datasourceName}_${sourceId}`)){
              checkDoi = null
            }
            const pubFound = await this.isPublicationAlreadyInDB(checkDoi, sourceId, csl, normedPub.datasourceName)
            if (!pubFound) {
              // console.log(`Inserting Publication #${processedCount} of total ${count} DOI: ${doi} from source: ${doiStatus.sourceName}`)
              const publicationId = await this.insertPublicationAndAuthors(csl.valueOf()['title'], checkDoi, csl, authors, normedPub.datasourceName, sourceId, sourceMetadata)
              // console.log('Finished Running Insert and starting next thread')
              //console.log(`Inserted pub: ${JSON.stringify(publicationId,null,2)}`)

              //console.log(`Publication Id: ${publicationId} Matched Persons count: ${_.keys(matchedPersons).length}`)
              // now insert a person publication record for each matched Person
              let loopCounter2 = 0
              await pMap(_.keys(matchedPersons), async function (personId){
                try {
                  const person = matchedPersons[personId]
                  loopCounter2 += 1
                  //have each wait a pseudo-random amount of time between 1-5 seconds
                  await randomWait(loopCounter2)
                  const mutateResult = await this.client.mutate(
                    insertPersonPublication(personId, publicationId, person['confidence'])
                  )

                  const newPersonPubId = await mutateResult.data.insert_persons_publications.returning[0]['id']
                } catch (error) {
                  const errorMessage = `Error on add person id ${JSON.stringify(personId,null,2)} to publication id: ${publicationId}`
                  throw (error)
                }
              }, { concurrency: 1 })
            } else {
              console.log(`Skipping doi already in DB: ${normedPub.doi} for source: ${normedPub.datasourceName}`)
            }
          })
        } else {
          if (_.keys(matchedPersons).length <= 0){
            errorMessage = `No author match found for ${normedPub.doi} and not added to DB`
          }
        }
      } else {
        errorMessage = `${normedPub.doi} and not added to DB with unknown type ${csl.valueOf()['type']} or no title defined in DOI csl record` //, csl is: ${JSON.stringify(csl, null, 2)}`
        console.log(errorMessage)
      }
    }

    // async updateConfidenceMeasures(normedPub: NormedPublication) {
    //   const calculateConfidence = new CalculateConfidence()

    //   // get the set of persons to test
    //   await this.initializeNormedPersons()

    //   // now make sure confirmed authors are loaded
    //   await this.initializeConfirmedAuthors()

    //   // first do against current values and then have updated based on what is found
    //   // run against all pubs in DB and confirm have same confidence value calculation
    //   // calculate confidence for publications
    //   const testAuthors2 = []
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===53}))
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===17}))
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===94}))
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===78}))
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===48}))
    //   // testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===61}))
    //   testAuthors2.push(_.find(testAuthors, (testAuthor) => { return testAuthor['id']===120}))
    //   // console.log(`Test authors: ${JSON.stringify(testAuthors2, null, 2)}`)

    //   // get where last confidence test left off
    //   // get all person publications without a confidence set

    //   // const lastConfidenceSet = await calculateConfidence.getLastPersonPubConfidenceSet()
    //   const overWriteExisting = false

    //   console.log(`Overwrite existing confidence sets: ${overWriteExisting}`)
    //   // const publicationYear = 2020
    //   const publicationYear = undefined

    //   // break up authors into groups of 20
    //   const testAuthorGroups = _.chunk(testAuthors, 10)
    //   await pMap (testAuthorGroups, async (authors, index) => {
    //     const confidenceTests = await calculateConfidence.calculateConfidence (authors, (confirmedAuthorsByDoi || {}), overWriteExisting, publicationYear)

    //     // next need to write checks found to DB and then calculate confidence accordingly
    //     let errorsInsert = []
    //     let passedInsert = []
    //     let totalConfidenceSets = 0
    //     let totalSetItems = 0
    //     let totalSetItemsInserted = 0

    //     console.log(`Exporting results to csv if any warnings or failures...`)
    //     if (confidenceTests['failed'] && confidenceTests['failed'].length>0){
    //       const outputFailed = _.map(confidenceTests['failed'], test => {
    //         test['author'] = JSON.stringify(test['author'])
    //         test['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
    //         test['confidenceItems'] = JSON.stringify(test['confidenceItems'])
    //         return test
    //       })

    //       //write data out to csv
    //       await writeCsv({
    //         path: `../data/failed_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
    //         data: outputFailed,
    //       });
    //     } else {
    //       console.log('No failures to output.')
    //     }

    //     if (confidenceTests['warning'] && confidenceTests['warning'].length>0){
    //       const outputWarning = _.map(confidenceTests['warning'], test => {
    //         test['author'] = JSON.stringify(test['author'])
    //         test['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
    //         test['confidenceItems'] = JSON.stringify(test['confidenceItems'])
    //         return test
    //       })

    //       await writeCsv({
    //         path: `../data/warning_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
    //         data: outputWarning,
    //       });
    //     } else {
    //       console.log('No warnings to output.')
    //     }

    //     // const outputPassed = _.map(confidenceTests['passed'], test => {
    //     //   let obj = {}
    //     //   obj['author'] = JSON.stringify(test['author'])
    //     //   obj['author_id'] = test['author']['id']
    //     //   obj['author_names'] = test['author']['names']
    //     //   obj['confirmedAuthors'] = JSON.stringify(test['confirmedAuthors'])
    //     //   obj['confidenceItems'] = JSON.stringify(test['confidenceItems'])
    //     //   return obj
    //     // })

    //     // await writeCsv({
    //     //   path: `../data/passed_confidence.${moment().format('YYYYMMDDHHmmss')}.csv`,
    //     //   data: outputPassed,
    //     // });

    //     console.log('Beginning insert of confidence sets...')
    //     console.log(`Inserting Author Confidence Sets Batch (${(index + 1)} of ${testAuthorGroups.length})...`)
    //     await pMap (_.keys(confidenceTests), async (testStatus) => {
    //       // console.log(`trying to insert confidence values ${testStatus}`)
    //       let loopCounter = 1
    //       // console.log(`Inserting Author Confidence Sets ${testStatus} ${confidenceTests[testStatus].length}...`)
    //       await pMap (confidenceTests[testStatus], async (confidenceTest) => {
    //         // console.log('trying to insert confidence values')
    //         await randomWait(loopCounter)
    //         loopCounter += 1
    //         try {
    //           // console.log(`Tabulating total for ${JSON.stringify(confidenceTest, null, 2)}`)
    //           totalConfidenceSets += 1
    //           _.each(_.keys(confidenceTest['confidenceItems']), (rank) => {
    //             _.each(_.keys(confidenceTest['confidenceItems'][rank]), (confidenceType) => {
    //               totalSetItems += 1
    //             })
    //           })
    //           // console.log(`Starting to insert confidence set ${JSON.stringify(confidenceTest, null, 2)}`)
    //           const insertedConfidenceSetItems = await calculateConfidence.insertConfidenceTestToDB(confidenceTest, confidenceAlgorithmVersion)
    //           passedInsert.push(confidenceTest)
    //           totalSetItemsInserted += insertedConfidenceSetItems.length
    //         } catch (error) {
    //           errorsInsert.push(error)
    //           throw error
    //         }
    //       }, {concurrency: 1})
    //     }, {concurrency: 1})
    //     console.log('Done inserting confidence Sets...')
    //     console.log(`Errors on insert of confidence sets: ${JSON.stringify(errorsInsert, null, 2)}`)
    //     console.log(`Total Errors on insert of confidence sets: ${errorsInsert.length}`)
    //     console.log(`Total Sets Tried: ${totalConfidenceSets} Passed: ${passedInsert.length} Failed: ${errorsInsert.length}`)
    //     console.log(`Total Set Items Tried: ${totalSetItems} Passed: ${totalSetItemsInserted}`)
    //     console.log(`Passed tests: ${confidenceTests['passed'].length} Warning tests: ${confidenceTests['warning'].length} Failed Tests: ${confidenceTests['failed'].length}`)
    //   }, { concurrency: 1} )
    // }
    //   // 
    // }

    async ingestFromFiles (jsonFileDir, manifestFilePath) {
      // create master manifest of unique publications
    }
}