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
import ConfidenceSet from './confidenceSet'
import { randomWait } from '../units/randomWait'

import _ from 'lodash'
import IngesterConfig from './ingesterConfig'
import DataSourceConfig from './dataSourceConfig'
import { PubMedDataSource } from './pubmedDataSource'
import { SemanticScholarDataSource } from './semanticScholarDataSource'
import { WosDataSource } from './wosDataSource'
import readPersonPublication from '../gql/readPersonPublication'
import readPersonPublicationByPersonIdPubId from '../gql/readPersonPublicationByPersonIdPubId'
import readConfidenceSetByPersonPubId from '../gql/readConfidenceSetByPersonPubId'
const getIngestFilePaths = require('../getIngestFilePaths');
import IngestStatus from './ingestStatus'
import { ConfidenceSetStatusValue, PersonPublicationStatusValue, PublicationStatus, PublicationStatusValue } from './publicationStatus'
import { getTsBuildInfoEmitOutputFilePath, isArrayBindingPattern } from 'typescript'
export class Ingester {
  client: ApolloClient<NormalizedCacheObject>
  normedPersons: Array<NormedPerson>
  confirmedAuthorsByDoi: {}
  calculateConfidence: CalculateConfidence
  normedPersonMutex: Mutex
  confirmedAuthorMutex: Mutex
  pubExistsMutex: Mutex
  personPubExistsMutex: Mutex
  confidenceSetExistsMutex: Mutex
  config: IngesterConfig
  pubmedDS: PubMedDataSource
  semanticScholarDS: SemanticScholarDataSource
  wosDS: WosDataSource

  constructor (config: IngesterConfig, client: ApolloClient<NormalizedCacheObject>) {
    this.config = config
    this.client = client
    this.calculateConfidence = new CalculateConfidence(config.minConfidence.valueOf(), config.confidenceAlgorithmVersion)
    this.normedPersonMutex = new Mutex()
    this.confirmedAuthorMutex = new Mutex()
    this.pubExistsMutex = new Mutex()
    this.personPubExistsMutex = new Mutex()
    this.confidenceSetExistsMutex = new Mutex()
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
    await this.normedPersonMutex.dispatch( async () => {
      if (!this.normedPersons) {
        this.normedPersons = await getAllNormedPersons(this.client)
        // console.log(`Initialized Normed Persons: ${JSON.stringify(this.normedPersons, null, 2)}`)
        console.log(`Initialized ${this.normedPersons.length} Normed Persons`)
      }
    })
  }

  async initializeConfirmedAuthors() {
    await this.confirmedAuthorMutex.dispatch( async () => {
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
        // console.log(`Initialized Confirmed authors: ${JSON.stringify(this.confirmedAuthorsByDoi, null, 2)}`)
        console.log(`Initialized confirmed authors for ${_.keys(this.confirmedAuthorsByDoi).length} DOIs`)
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

  async insertPublicationAndAuthors (title, doi, csl: Csl, authors, sourceName, sourceId, sourceMetadata, minPublicationYear?) {
    //console.log(`trying to insert pub: ${JSON.stringify(title,null,2)}, ${JSON.stringify(doi,null,2)}`)
    try  {
      const publicationYear = Csl.getPublicationYear(csl)
      if (minPublicationYear != undefined && publicationYear < minPublicationYear) {
        console.log(`Skipping adding publication from year: ${publicationYear}`)
        return
      }
  
      const publication = {
        title: title,
        doi: doi,
        year: publicationYear,
        csl: csl.valueOf(),  // put these in as JSONB
        source_name: sourceName,
        source_id: sourceId,
        source_metadata: sourceMetadata, // put these in as JSONB,
        csl_string: JSON.stringify(csl.valueOf())
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

  async getConfidenceSetIdForPersonPubIfAlreadyInDB (personPublicationId): Promise<number> {
    const queryResult = await this.client.query(readConfidenceSetByPersonPubId(personPublicationId))
    if (queryResult.data.confidencesets_persons_publications.length > 0) {
      // console.log(`Person pubs found: ${JSON.stringify(queryResult.data.persons_publications, null, 2)}`)
      return queryResult.data.confidencesets_persons_publications[0].id
    } else {
      return undefined
    }
  }

  async getPersonPublicationIdIfAlreadyInDB (personId, publicationId) : Promise<number> {
    const queryResult = await this.client.query(readPersonPublicationByPersonIdPubId(personId, publicationId))
    if (queryResult.data.persons_publications.length > 0) {
      // console.log(`Person pubs found: ${JSON.stringify(queryResult.data.persons_publications, null, 2)}`)
      return queryResult.data.persons_publications[0].id
    } else {
      return undefined
    }
  }

  // returns publication id if exists, otherwise undefined
  async getPublicationIdIfAlreadyInDB (doi, sourceId, csl: Csl, sourceName) : Promise<number> {
    let foundPub = false
    let publicationId
    const title = csl.valueOf()['title']
    const publicationYear = Csl.getPublicationYear(csl)
    if (doi !== null){
      const queryResult = await this.client.query(readPublicationsByDoi(doi))
      // console.log(`Publications found for doi: ${doi}, ${queryResult.data.publications.length}`)
      if (queryResult.data.publications && queryResult.data.publications.length > 0){
        _.each(queryResult.data.publications, (publication) => {
          if (publication.doi && publication.doi !== null && _.toLower(publication.doi) === _.toLower(doi) && _.toLower(publication.source_name) === _.toLower(sourceName)) {
            foundPub = true
            publicationId = publication.id
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
          publicationId = publication.id
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
          publicationId = publication.id
        }
        // console.log(`Checking existing publication title: '${publication.title}' year: '${JSON.stringify(publication.year)}' against title: '${title}' year: '${JSON.stringify(publicationYear)}' foundPub after is: ${foundPub}`)
      })
    }
    return publicationId
  }

  dedupByDoi (normedPubs: NormedPublication[]): NormedPublication[] {
    return this.dedup(normedPubs, true)
  }

  dedupBySource  (normedPubs: NormedPublication[]): NormedPublication[] {
    return this.dedup(normedPubs, false)
  }

  //returns a new list of normedPublications with a single pub per DOI or by source
  dedup (normedPubs: NormedPublication[], dedupByDoi): NormedPublication[] {
    // console.log(`Author papers are: ${JSON.stringify(authorPapers, null, 2)}`)
    let counter = 0
    // last one will have the doi as key, reducing to one pub per doi only
    const pubsByKey= _.mapKeys(normedPubs, function(normedPub: NormedPublication) {
      counter += 1
      if (dedupByDoi) {
        return NormedPublication.getDoiKey(normedPub)
      } else {
        return NormedPublication.getSourceKey(normedPub)
      }
    })
    return _.values(pubsByKey)
  }

  async ingest (publications: NormedPublication[], checkNewPersonMatches: boolean, overwriteConfidenceSets: boolean, dedupByDoi: boolean = false, threadCount: number = 1, waitInterval: number = 1000): Promise<IngestStatus> {
    let ingestStatus = new IngestStatus()
    // do for loop
    let dedupedPubs: NormedPublication[]
    if (dedupByDoi) {
      //reduce to unique by doi
      dedupedPubs = this.dedupByDoi(publications)
    } else {
      dedupedPubs = this.dedupBySource(publications)
    }
    await pMap(dedupedPubs, async (publication, index) => {
      try {
        console.log(`Ingesting publication count: ${index+1} of ${dedupedPubs.length}`)
        const pubStatus: PublicationStatus = await this.ingestNormedPublication(publication, checkNewPersonMatches, overwriteConfidenceSets)
        ingestStatus.log(pubStatus)
      } catch (error) {
        const errorMessage = `Error encountered on ingest of publication title: ${publication.title}, error: ${error}`
        const publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION
        const publicationId = -1
        // only create object when want to halt execution
        const pubStatus = new PublicationStatus(publication, publicationId, errorMessage, publicationStatusValue)
        ingestStatus.log(pubStatus)
        console.log(errorMessage)
      }
    }, { concurrency: 1 })
    return ingestStatus
  }

  // returns the publication id of the ingested publication
  async ingestNormedPublication (normedPub: NormedPublication, checkNewPersonMatches: boolean, overwriteConfidenceSets: boolean): Promise<PublicationStatus> {
    // only do something if the first call on this object
    await this.initializeNormedPersons()
    const testAuthors = this.normedPersons
    const thisIngester = this
    let publicationId: number
    let pubStatus: PublicationStatus
    let publicationStatusValue: PublicationStatusValue
    let personPublicationStatusValue: PersonPublicationStatusValue
    let confidenceSetStatusValue: ConfidenceSetStatusValue
    let addedPub: boolean = false

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
      let matchedPersons: Map<number,ConfidenceSet> = await this.calculateConfidence.matchPeopleToPaperAuthors(csl, testAuthors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName)
      //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

      if (_.keys(matchedPersons).length <= 0){
        // try to match against authors from source if nothing found yet
        // console.log(`No matching authors found from csl, doi: ${normedPub.doi} checking source metadata...`)
        csl.setAuthors(await this.getCSLAuthorsFromSourceMetadata(normedPub.datasourceName, sourceMetadata))
        authors = csl.valueOf()['author']
        // console.log(`After check from source metadata if needed authors are: ${JSON.stringify(csl.author, null, 2)}`)
        if (csl.valueOf()['author'] && csl.valueOf()['author'].length > 0){
          matchedPersons = await this.calculateConfidence.matchPeopleToPaperAuthors(csl, testAuthors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName)
        }
      }

      if (_.keys(matchedPersons).length > 0){
        const publicationYear = Csl.getPublicationYear(csl)
        const sourceId = normedPub.sourceId
        // reset doi if it is a placeholder
        let checkDoi = normedPub.doi
        if (_.toLower(normedPub.doi) === _.toLower(`${normedPub.datasourceName}_${sourceId}`)){
          checkDoi = null
        }

        try {
          await this.pubExistsMutex.dispatch( async () => {
            publicationId = await this.getPublicationIdIfAlreadyInDB(checkDoi, sourceId, csl, normedPub.datasourceName)
            if (!publicationId) {
              console.log(`Inserting Publication DOI: ${normedPub.doi} from source: ${normedPub.datasourceName}`)
              publicationId = await this.insertPublicationAndAuthors(normedPub.title, checkDoi, csl, authors, normedPub.datasourceName, sourceId, sourceMetadata)
              publicationStatusValue = PublicationStatusValue.ADDED_PUBLICATION
              addedPub = true
            } else {
              const warningMessage = `Warning skipping add existing publication for DOI: ${normedPub.doi} from source: ${normedPub.datasourceName} title: ${normedPub.title}`
              console.log(warningMessage)
              publicationStatusValue = PublicationStatusValue.SKIPPED_ADD_PUBLICATION
            }
          })
        } catch (error) {
          const errorMessage = `Failed to insert publication title: ${normedPub.title} error: ${error}`
          console.log(errorMessage)
          publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION
          // only create object when want to halt execution
          pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
          return pubStatus
        }

        if (pubStatus) {
          return pubStatus
        }

        let loopCounter2 = 0
        const defaultWaitInterval = this.config.defaultWaitInterval
        let addedPersons: boolean = false
        let addedConfidenceSets: boolean = false
        await pMap(_.keys(matchedPersons), async function (personId){
          try {
            const confidenceSet: ConfidenceSet = matchedPersons[personId]
            loopCounter2 += 1
            //have each wait a pseudo-random amount of time between 1-5 seconds
            await randomWait(defaultWaitInterval)
            let newPersonPubId
            let currentPersonPubId
            try {
              await thisIngester.personPubExistsMutex.dispatch( async () => {
                // returns 
                currentPersonPubId = await thisIngester.getPersonPublicationIdIfAlreadyInDB(personId, publicationId)
                if ((addedPub || checkNewPersonMatches) && !currentPersonPubId) {
                  // sconsole.log(`Inserting person publication person id: ${personId} publication id: ${publicationId}`)
                  const mutateResult = await thisIngester.client.mutate(
                    insertPersonPublication(personId, publicationId, confidenceSet.confidenceTotal)
                  )
                  newPersonPubId = await mutateResult.data.insert_persons_publications.returning[0]['id']
                  currentPersonPubId = newPersonPubId
                  addedPersons = true
                } else if (checkNewPersonMatches) {
                  console.log(`Warning: Person publication already found for person id: ${personId} publication id: ${publicationId} person Pub id: ${currentPersonPubId}`)
                }
              })
            } catch (error) {
              const errorMessage = `Error encountered on add person publications for publication id: ${publicationId}, error: ${error}`
              console.log(errorMessage)
              personPublicationStatusValue = PersonPublicationStatusValue.FAILED_ADD_PERSON_PUBLICATIONS
              pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
              return pubStatus
            }

            if (!currentPersonPubId && checkNewPersonMatches) {
              //error happened somewhere
              const errorMessage = `Unknown error encountered on add person publications for publication id: ${publicationId}`
              console.log(errorMessage)
              personPublicationStatusValue = PersonPublicationStatusValue.FAILED_ADD_PERSON_PUBLICATIONS
              pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
              return pubStatus
            }

            // change to check if confidence set exists or not if not overwrite...
            if (currentPersonPubId) {
              try {
                await thisIngester.confidenceSetExistsMutex.dispatch( async () => {
                  let currentConfidenceSetId
                  if (!overwriteConfidenceSets) {
                    currentConfidenceSetId = await thisIngester.getConfidenceSetIdForPersonPubIfAlreadyInDB(currentPersonPubId)
                  }
                  if (overwriteConfidenceSets || !currentConfidenceSetId){
                    // now insert confidence sets
                    // use personpubid and matched person from above to insert
                    const insertedConfidenceSetItems = await thisIngester.calculateConfidence.insertConfidenceSetToDB(confidenceSet, currentPersonPubId)
                    if (insertedConfidenceSetItems.length > 0) {
                      addedConfidenceSets = true
                    } else {
                      const errorMessage = `Unknow error and 0 confidence sets were added for publication id: ${publicationId} and personPub id: ${currentPersonPubId}`
                      console.log(errorMessage)
                      personPublicationStatusValue = (addedPersons ? PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS : PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS) 
                      confidenceSetStatusValue = ConfidenceSetStatusValue.FAILED_ADD_CONFIDENCE_SETS
                      pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
                      return pubStatus
                    }
                  }
                })
              } catch (error) {
                const errorMessage = `Error encountered on add confidence set for publication id: ${publicationId} and personPub id: ${currentPersonPubId}, error: ${error}`
                console.log(errorMessage)
                personPublicationStatusValue = (addedPersons ? PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS : PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS) 
                confidenceSetStatusValue = ConfidenceSetStatusValue.FAILED_ADD_CONFIDENCE_SETS
                pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
                return pubStatus
              }
            }
          } catch (error) {
            const errorMessage = `Error on add person id ${personId} to publication id: ${publicationId}`
            console.log(errorMessage)
            personPublicationStatusValue = PersonPublicationStatusValue.FAILED_ADD_PERSON_PUBLICATIONS
            pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
            return pubStatus
          }
        }, { concurrency: 1 })

        if (addedPub && !addedPersons) {
          const errorMessage = `Failed to add persons for new publication id: ${publicationId}`
          console.log(errorMessage)
          personPublicationStatusValue = PersonPublicationStatusValue.FAILED_ADD_PERSON_PUBLICATIONS
          pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
          return pubStatus
        } else if (addedPub && !addedConfidenceSets) {
          const errorMessage = `Failed to add confidence sets for new publication id: ${publicationId}`
          console.log(errorMessage)
          personPublicationStatusValue = (addedPersons ? PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS : PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS)
          confidenceSetStatusValue = ConfidenceSetStatusValue.FAILED_ADD_CONFIDENCE_SETS
          pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
          return pubStatus
        }

        if (!pubStatus) {
          const message = `Passed ingest of publication: ${publicationId}`
          personPublicationStatusValue = (addedPersons ? PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS : PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS)
          confidenceSetStatusValue = (addedConfidenceSets ? ConfidenceSetStatusValue.ADDED_CONFIDENCE_SETS : ConfidenceSetStatusValue.SKIPPED_ADD_CONFIDENCE_SETS)          
          pubStatus = new PublicationStatus(normedPub, publicationId, message, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
          console.log(`Everything passed added pub: ${addedPub}, added person pubs: ${addedPersons}, added conf sets: ${addedConfidenceSets}, pubStatus: ${PublicationStatusValue[publicationStatusValue]}, personPubStatus: ${PersonPublicationStatusValue[personPublicationStatusValue]}, confSetStatus: ${ConfidenceSetStatusValue[confidenceSetStatusValue]}`)
        }
      } else {
        if (_.keys(matchedPersons).length <= 0){
          errorMessage = `No author match found for ${normedPub.doi} and not added to DB`
          console.log(errorMessage)
          publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_NO_PERSON_MATCH
          publicationId = -1
          pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
        }
      }
    } else {
      errorMessage = `${normedPub.doi} and not added to DB with unknown type ${csl.valueOf()['type']} or no title defined in DOI csl record` //, csl is: ${JSON.stringify(csl, null, 2)}`
      console.log(errorMessage)
      publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_UNKNOWN_PUB_TYPE
      publicationId = -1
      pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
    }
    if (!pubStatus) {
      throw(`Unknown error on add publication`)
    }
    return pubStatus
  }

  async ingestFromFiles (dataDirPath: string, manifestFilePath: string, checkNewPersonMatches: boolean, overwriteConfidenceSets: boolean, dedupByDoi: boolean): Promise<IngestStatus> {
    // create master manifest of unique publications
    let count = 0
    let ingestStatus: IngestStatus
    try {
      console.log(`Ingesting publications from ${manifestFilePath}, checkNewPersonMatches: ${checkNewPersonMatches} overwriteConfidenceSets: ${overwriteConfidenceSets}`)

      // get normed publications from filedir and manifest
      const normedPubs: NormedPublication[] = await NormedPublication.loadFromCSV(manifestFilePath, dataDirPath)
      ingestStatus = await this.ingest(normedPubs, checkNewPersonMatches, overwriteConfidenceSets, dedupByDoi)
      // console.log(`Ingest status is: ${JSON.stringify(ingestStatus)}`)
    } catch (error) {
      console.log(`Error encountered on ingest publication with paths manifest: '${manifestFilePath}' data dir path: '${dataDirPath}'`)
      throw (error)
    }
    return ingestStatus
  }
}