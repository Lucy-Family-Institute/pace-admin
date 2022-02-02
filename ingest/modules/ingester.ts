import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import BibTex from './bibTex'
import { Mutex } from '../units/mutex'
import Cite from 'citation-js'
import Csl from './csl'
import pMap from 'p-map'
import path from 'path'
import moment from 'moment'
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
import { command as writeCsv } from '../units/writeCsv'
import Normalizer from '../units/normalizer'

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
import FsHelper from '../units/fsHelper'
import DataSourceHelper from './dataSourceHelper'
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

  constructor (config: IngesterConfig, client: ApolloClient<NormalizedCacheObject>) {
    this.config = config
    this.client = client
    this.calculateConfidence = new CalculateConfidence(config.minConfidence.valueOf(), config.confidenceAlgorithmVersion)
    this.normedPersonMutex = new Mutex()
    this.confirmedAuthorMutex = new Mutex()
    this.pubExistsMutex = new Mutex()
    this.personPubExistsMutex = new Mutex()
    this.confidenceSetExistsMutex = new Mutex()
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
        // is a list of maps from each file loaded, map is doi to confirmed author
        // will merge them below
        let confirmedAuthorsByDoiMaps = []
        // need to check on this as json file loaded with years or just a path
        const paths = await FsHelper.loadDirPaths(this.config.confirmedAuthorFileDir)
        // getIngestFilePaths(this.config.confirmedAuthorFileDir)

        await pMap(paths, async (path) => {
          console.log(`Loading ${path} Confirmed Authors`)
          confirmedAuthorsByDoiMaps.push(await NormedPublication.getConfirmedAuthorsByDoiFromCSV(path))
        }, { concurrency: 1 })
  
        // combine the confirmed author lists together
        this.confirmedAuthorsByDoi = new Map()
        _.each(confirmedAuthorsByDoiMaps, (confirmedAuthorsByDoiMap) => {
          _.each(_.keys(confirmedAuthorsByDoiMap), (doi) => {
            this.confirmedAuthorsByDoi[doi] = _.concat((this.confirmedAuthorsByDoi[doi] || []), _.values(confirmedAuthorsByDoiMap[doi]))
          })
        })
        // console.log(`Initialized Confirmed authors: ${JSON.stringify(this.confirmedAuthorsByDoi, null, 2)}`)
        console.log(`Initialized confirmed authors for ${_.keys(this.confirmedAuthorsByDoi).length} DOIs`)
      }
    })
  }

  async getCSLAuthorsFromSourceMetadata(sourceName, sourceMetadata) {
    const ds: DataSource = DataSourceHelper.getDataSource(sourceName)
    if (ds) {
      return await ds.getCSLStyleAuthorList(sourceMetadata)
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
    if (!csl || !csl.valueOf()) {
      throw('Csl undefined on check if publication in DB')
    }
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

  async ingest (publications: NormedPublication[], csvDirBaseName: string, csvFileBaseName: string, totalRows: number, threadCount: number, dataDirPath?: string): Promise<IngestStatus> {
    let ingestStatus = new IngestStatus(csvFileBaseName, csvDirBaseName, this.config)
    // do for loop
    let dedupedPubs: NormedPublication[]
    if (this.config.dedupByDoi) {
      //reduce to unique by doi
      dedupedPubs = this.dedupByDoi(publications)
    } else {
      dedupedPubs = this.dedupBySource(publications)
    }
    await pMap(dedupedPubs, async (publication: NormedPublication, index) => {
      const sourceMetadata = NormedPublication.getSourceMetadata(publication, dataDirPath)
      try {
        console.log(`Ingesting publication batch: (${index+1} of ${dedupedPubs.length}) of ${totalRows} total publications`)
        const pubStatus: PublicationStatus = await this.ingestNormedPublication(publication, sourceMetadata)
        await ingestStatus.log(pubStatus, sourceMetadata)
      } catch (error) {
        const errorMessage = `Error encountered on ingest of publication title: ${publication.title}, error: ${error}`
        const publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION
        const publicationId = -1
        // only create object when want to halt execution
        const pubStatus = new PublicationStatus(publication, publicationId, errorMessage, publicationStatusValue)
        await ingestStatus.log(pubStatus, sourceMetadata)
        console.log(errorMessage)
      }
    }, { concurrency: threadCount })
    return ingestStatus
  }

  // returns the publication id of the ingested publication
  async ingestNormedPublication (normedPub: NormedPublication, sourceMetadata?: Object): Promise<PublicationStatus> {
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
      csl = await NormedPublication.getCsl(normedPub, this.config.defaultToBibTex, sourceMetadata)
    } catch (error) {
      console.log(`Throwing the error for doi: ${normedPub.doi}`)
      throw (error)
    }
    
    //retrieve the authors from the record and put in a map, returned above in array, but really just one element
    let authors = []
  
    if (csl && csl.valueOf() && csl.cslJson) {
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

    if (!sourceMetadata) sourceMetadata = csl.valueOf()
    let errorMessage = ''

    const types = this.config.publicationTypes
    //   'manuscript',
    //   'monograph',
    //   'journal',
    //   'article-journal',
    //   'article',
    //   'paper-conference',
    //   'chapter',
    //   'book',
    //   'dissertation',
    //   'peer-review',
    //   'reference-entry',
    //   'reference-book',
    //   'report',
    //   'report-series'
    // ]

    let publicationYear = undefined
    if (csl) {
      publicationYear = Csl.getPublicationYear (csl)
    } 

    // if at least one author, add the paper, and related personpub objects
    if(csl && csl.valueOf() && csl.valueOf()['type'] && _.includes(types, csl.valueOf()['type']) && csl.valueOf()['title']) {
      // push in csl record to jsonb blob
      if (!normedPub.doi && csl.valueOf()['DOI']) {
        normedPub.doi = csl.valueOf()['DOI']
      }

      //match paper authors to people
      //console.log(`Testing for Author Matches for DOI: ${doi}`)
      let matchedPersons: Map<number,ConfidenceSet> = await this.calculateConfidence.matchPeopleToPaperAuthors(csl, testAuthors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName, sourceMetadata)
      //console.log(`Person to Paper Matches: ${JSON.stringify(matchedPersons,null,2)}`)

      if (_.keys(matchedPersons).length <= 0 && csl && csl.valueOf()){
        // try to match against authors from source if nothing found yet
        // console.log(`No matching authors found from csl, doi: ${normedPub.doi} checking source metadata...${JSON.stringify(sourceMetadata)}`)
        csl.setAuthors(await this.getCSLAuthorsFromSourceMetadata(normedPub.datasourceName, sourceMetadata))
        
        authors = csl.valueOf()['author']
        // console.log(`After check from source metadata if needed authors are: ${JSON.stringify(csl.author, null, 2)}`)
        if (csl.valueOf()['author'] && csl.valueOf()['author'].length > 0){
          matchedPersons = await this.calculateConfidence.matchPeopleToPaperAuthors(csl, testAuthors, this.confirmedAuthorsByDoi[normedPub.doi], normedPub.datasourceName, sourceMetadata)
        }
      }

      let addedPersonsCount = 0
      let addedConfSetCount = 0
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
                if ((addedPub || thisIngester.config.checkForNewPersonMatches) && !currentPersonPubId) {
                  // sconsole.log(`Inserting person publication person id: ${personId} publication id: ${publicationId}`)
                  const mutateResult = await thisIngester.client.mutate(
                    insertPersonPublication(personId, publicationId, confidenceSet.confidenceTotal)
                  )
                  newPersonPubId = await mutateResult.data.insert_persons_publications.returning[0]['id']
                  currentPersonPubId = newPersonPubId
                  addedPersonsCount += 1
                  addedPersons = true
                }
                // } else if (thisIngester.config.checkForNewPersonMatches) {
                //   console.log(`Warning: Person publication already found for person id: ${personId} publication id: ${publicationId} person Pub id: ${currentPersonPubId}`)
                // }
              })
            } catch (error) {
              const errorMessage = `Error encountered on add person publications for publication id: ${publicationId}, error: ${error}`
              console.log(errorMessage)
              personPublicationStatusValue = PersonPublicationStatusValue.FAILED_ADD_PERSON_PUBLICATIONS
              pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
              return pubStatus
            }

            if (!currentPersonPubId && thisIngester.config.checkForNewPersonMatches) {
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
                  if (!thisIngester.config.overwriteConfidenceSets) {
                    currentConfidenceSetId = await thisIngester.getConfidenceSetIdForPersonPubIfAlreadyInDB(currentPersonPubId)
                  }
                  if (thisIngester.config.overwriteConfidenceSets || !currentConfidenceSetId){
                    // now insert confidence sets
                    // use personpubid and matched person from above to insert
                    const insertedConfidenceSetItems = await thisIngester.calculateConfidence.insertConfidenceSetToDB(confidenceSet, currentPersonPubId)
                    if (insertedConfidenceSetItems.length > 0) {
                      addedConfSetCount += 1
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
          const message = `Passed ingest of publication: ${publicationId}, source: ${normedPub.datasourceName}, source_id: ${normedPub.sourceId} doi: ${normedPub.doi}`
          personPublicationStatusValue = (addedPersons ? PersonPublicationStatusValue.ADDED_PERSON_PUBLICATIONS : PersonPublicationStatusValue.SKIPPED_ADD_PERSON_PUBLICATIONS)
          confidenceSetStatusValue = (addedConfidenceSets ? ConfidenceSetStatusValue.ADDED_CONFIDENCE_SETS : ConfidenceSetStatusValue.SKIPPED_ADD_CONFIDENCE_SETS)          
          pubStatus = new PublicationStatus(normedPub, publicationId, message, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
          console.log(`Everything passed DOI: ${normedPub.doi} from source: ${normedPub.datasourceName}, added pub: ${addedPub},${addedPersonsCount} person pubs: ${addedPersons} (${addedPersonsCount} of ${_.keys(matchedPersons).length}), added conf sets: ${addedConfidenceSets} (${addedConfSetCount} of ${_.keys(matchedPersons).length}), pubStatus: ${PublicationStatusValue[publicationStatusValue]}, personPubStatus: ${PersonPublicationStatusValue[personPublicationStatusValue]}, confSetStatus: ${ConfidenceSetStatusValue[confidenceSetStatusValue]}`)
        }
      } else {
        if (_.keys(matchedPersons).length <= 0){
          const warningMessage = `Warning: No author match found for ${normedPub.doi} and not added to DB`
          console.log(warningMessage)
          publicationStatusValue = PublicationStatusValue.SKIPPED_ADD_PUBLICATION_NO_PERSON_MATCH
          publicationId = -1
          pubStatus = new PublicationStatus(normedPub, publicationId, warningMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
        }
      }
    } else {
      if (!csl || !csl.valueOf()){
        errorMessage = `Publication doi: '${normedPub.doi}' not added to DB because could not find or generate csl`
        publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_NO_CSL
      } else if (!csl.valueOf()['type']) {
        errorMessage = `Publication doi: '${normedPub.doi}' not added to DB because no type defined in DOI csl record`
        publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_UNKNOWN_PUB_TYPE
      } else if (!csl.valueOf()['title']){
        errorMessage = `Publication doi: '${normedPub.doi}' not added to DB because no title defined in DOI csl record`
        publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_UNKNOWN_TITLE
      } else {
        errorMessage = `Publication doi: '${normedPub.doi}' not added to DB with unknown type '${csl.valueOf()['type']}' in csl record` //, csl is: ${JSON.stringify(csl, null, 2)}`
        publicationStatusValue = PublicationStatusValue.FAILED_ADD_PUBLICATION_UNKNOWN_PUB_TYPE
      }
      console.log(errorMessage)
      publicationId = -1
      pubStatus = new PublicationStatus(normedPub, publicationId, errorMessage, publicationStatusValue, personPublicationStatusValue, confidenceSetStatusValue)
    }
    if (!pubStatus) {
      throw(`Unknown error on add publication`)
    }
    return pubStatus
  }

  async ingestFromFiles (dataDirPath: string, manifestFilePath: string, csvOutputFileBase: string, threadCount: number): Promise<IngestStatus> {
    // create master manifest of unique publications
    let count = 0
    let ingestStatus: IngestStatus
    try {
      console.log(`Ingesting publications from ${manifestFilePath}, with config: ${JSON.stringify(this.config)}`)

      let pageOffset = 0
      const pageSize = this.config.loadPageSize

      // get total rows from csv file
      const totalRows = await NormedPublication.getTotalCSVFileRows(manifestFilePath)
      // get normed publications from filedir and manifest
      let normedPubs: NormedPublication[] = await NormedPublication.loadFromCSV(manifestFilePath, dataDirPath, pageOffset, pageSize)
      ingestStatus = await this.ingest(normedPubs, csvOutputFileBase, `${csvOutputFileBase}_${pageOffset}`, totalRows, threadCount, dataDirPath)
      if (pageSize){
        // iterate over the remaining set until results returned are 0
        while (normedPubs && normedPubs.length > 0) {
          pageOffset += 1
          normedPubs = await NormedPublication.loadFromCSV(manifestFilePath, dataDirPath, pageOffset, pageSize)
          ingestStatus = IngestStatus.merge(ingestStatus, await this.ingest(normedPubs, csvOutputFileBase, `${csvOutputFileBase}_${pageOffset}`, totalRows, threadCount, dataDirPath))
        }
      }
      // console.log(`Ingest status is: ${JSON.stringify(ingestStatus)}`)
    } catch (error) {
      console.log(`Error encountered on ingest publication with paths manifest: '${manifestFilePath}' data dir path: '${dataDirPath}'`)
      throw (error)
    }
    return ingestStatus
  }

  async ingestStagedFiles(){
    const stagedDirs = FsHelper.loadDirList(this.config.stagedIngestDir)

    const threadCount = (this.config.threadCount ? this.config.threadCount : 5)

    const year = this.config.centerMemberYear
    console.log(`Loading ${year} Publication Data for staged paths: ${JSON.stringify(stagedDirs, null, 2)}`)
    //load data
    await pMap(stagedDirs, async (stagedPath, dirIndex) => {
      // ignore subdirectories
      // output results for this path
      // set label to the base of the path (file or dir)
      const normalizedLabel = Normalizer.normalizeString(path.basename(stagedPath))
      const statusCSVFileBase = `${normalizedLabel}_${year}_${moment().format('YYYYMMDDHHmmss')}_combined_status`
      let ingestStatusByPath: IngestStatus = new IngestStatus(statusCSVFileBase, statusCSVFileBase, this.config)
      try {
        const loadPaths = FsHelper.loadDirPaths(stagedPath, true)
        await pMap(loadPaths, async (filePath, fileIndex) => {
          // skip any subdirectories
          console.log(`Ingesting publications dir (${(dirIndex + 1)} of ${stagedDirs.length}) from paths (${(fileIndex + 1)} of ${loadPaths.length}) of path: ${filePath}`)
          const fileName = FsHelper.getFileName(filePath)
          const dataDir = FsHelper.getParentDir(filePath)
          const ingestStatus = await this.ingestFromFiles(dataDir, filePath, statusCSVFileBase, threadCount)
          ingestStatusByPath = IngestStatus.merge(ingestStatusByPath, ingestStatus)
        }, { concurrency: threadCount })

        // output remaining records
        await ingestStatusByPath.writeLogsToCSV()
      } catch (error) {
        //attempt to write status to file
        console.log(`Error on load staged path '${stagedPath}' files: ${error}, attempt to output logged status`)
        await ingestStatusByPath.writeLogsToCSV()
      }
    }, { concurrency: 1}) // these all need to be 1 thread so no collisions on checking if pub already exists if present in multiple files
  }

  // will look at existing publications for a given year and then run through the ingester essentially finding new matches
  // - AND/OR - recreating confidence measures if overwrite confidence is enabled in the config
  async checkCurrentPublicationsMatches(threadCount): Promise<IngestStatus> {
    const year = this.config.centerMemberYear
    // create master manifest of unique publications
    let count = 0
    let ingestStatus: IngestStatus
    try {
      console.log(`Checking publications in DB for year ${year} for new author matches, with config: ${JSON.stringify(this.config)}`)

      // get normed publications from filedir and manifest
      // need to figure out how to not have source metadata be pre-cached so as not to have memory errors, maybe retrieve number of rows with offset? or load source metadata for different batches?
      const normedPubs: NormedPublication[] = await NormedPublication.loadPublicationsFromDB(this.client, year)
      const statusCSVFileBase = `Check_new_matches_${year}_status`
      ingestStatus = await this.ingest(normedPubs, statusCSVFileBase, statusCSVFileBase, normedPubs.length, threadCount)
      // output remaining results for this path
      await ingestStatus.writeLogsToCSV()
 
      // console.log(`Ingest status is: ${JSON.stringify(ingestStatus)}`)
    } catch (error) {
      console.log(`Error encountered on check publication for year: ${year}`)
      throw (error)
    }
    return ingestStatus
  }
}