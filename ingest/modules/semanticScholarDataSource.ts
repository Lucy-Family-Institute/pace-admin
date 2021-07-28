import axios from 'axios'
import _, { isInteger } from 'lodash'
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import DataSource from './dataSource'
import HarvestSet from './HarvestSet'
import DataSourceConfig from './dataSourceConfig'
import { HarvestOperation } from './harvester'
import { PossibleFragmentSpreadsRule } from 'graphql'
import { wait } from '../units/randomWait'
import pMap from 'p-map'
import { getDateObject } from '../units/dateRange'
import { command as loadCsv} from '../units/loadCsv'

const nameParser = require('../units/nameParser').command;
export class SemanticScholarDataSource implements DataSource {

  private dsConfig: DataSourceConfig 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  // return object with query request params
  getAuthorQuery(person: NormedPerson, startDate?: Date, endDate?: Date){
    if (person.sourceIds) {
      return `authorId:${person.sourceIds.semanticScholarIds}`
    } else {
      return undefined
    }
  }

  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate?: Date, endDate?: Date) : Promise<HarvestSet> {
    throw (`Unsupported operation ${HarvestOperation.QUERY_BY_AUTHOR_NAME}`)
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorId(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    let finalTotalResults = 0
    let publications = []

    let skippedPublications = 0

    const minPublicationYear = (startDate ? startDate.getFullYear() : undefined)
    const maxPublicationYear = (endDate ? endDate.getFullYear() : undefined)

    if (!person.sourceIds || !person.sourceIds.semanticScholarIds) {
      throw (`Semantic Scholar Id not defined for Person: ${JSON.stringify(person)}`)
    }
    const authorIds = person.sourceIds.semanticScholarIds

    // need to make sure date string in correct format
    // fetch for each possible id expecting there could be more than one
    await pMap(authorIds, async (authorId) => {
      await wait(this.dsConfig.requestInterval)
      const results = await this.fetchSemanticScholarAuthorData(this.dsConfig.pageSize, offset, authorId)
      // console.log (`semantic scholar results are: ${_.keys(results['papers'])}`)
      if (results && results['papers']){
        
        const totalResults = Number.parseInt(results['papers'].length)
        finalTotalResults += totalResults
        if (totalResults > 0){
          // fetch metadata for each paper 
          await wait(this.dsConfig.requestInterval)
          const papers = results['papers']
          await pMap (papers, async (paper, index) => {
            const paperId = paper['paperId']
            let paperYear = paper['year']
            let skipPublication = false
            if (paperYear) {
              paperYear = Number.parseInt(paperYear)              
              if (minPublicationYear) {
                if (paperYear < minPublicationYear) {
                  skipPublication = true
                } else if (maxPublicationYear && paperYear > maxPublicationYear) {
                  skipPublication = true
                }
              }
            }
            if (!skipPublication) {
              await wait(this.dsConfig.requestInterval)
              console.log(`Fetching paper metadata (${(index + 1)} of ${totalResults}) for author: ${person.familyName}, ${person.givenName}`)
              const paperMetadata = await this.fetchSemanticScholarPaperData(paperId)        
              publications.push(paperMetadata)
            } else {
              console.log(`Skipping paper metadata (${(index + 1)} of ${totalResults}) for author: ${person.familyName}, ${person.givenName} with publication year: ${paperYear}`)
              skippedPublications += 1
              finalTotalResults = finalTotalResults.valueOf() - 1
            }
          }, { concurrency: 1 })
        }
      } else {
        finalTotalResults += 0
      }
    }, { concurrency: 1})
    console.log(`Fetched ${(finalTotalResults)} publications and Skipped ${skippedPublications} publications outside of publication target range for author: ${person.familyName}, ${person.givenName}`)
    

    const result: HarvestSet = {
        sourceName: this.getSourceName(),
        searchPerson: person,
        query: `authorIds:${authorIds}`,
        sourcePublications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: finalTotalResults
    }

    return result
  }

  async fetchSemanticScholarPaperData(paperId) : Promise<any> {
    console.log(`Fetching semantic scholar paper id: ${paperId}`)

    const baseUrl = (this.dsConfig.publicationUrl ? this.dsConfig.publicationUrl : `${this.dsConfig.baseUrl}/paper/`)
    const url = `${baseUrl}${paperId}`
    const response = await axios.get(url, {
      headers: {
      },
      params: {
      }
    })

    return response.data
  }

  async fetchSemanticScholarAuthorData(pageSize, offset, authorId, affiliation?, filter?) : Promise<any> {
    console.log(`Querying semantic scholar offset: ${offset}, and authorId: ${authorId}`)

    const baseUrl = (this.dsConfig.authorUrl ? this.dsConfig.authorUrl : `${this.dsConfig.baseUrl}/author/`)
    const url = `${baseUrl}${authorId}`
    const response = await axios.get(url, {
      headers: {
      },
      params: {
      }
    })

    return response.data
  }

  // async fetchSemanticScholarQuery(pageSize, offset, queryAuthor?, affiliation?, filter?) : Promise<any>{
  //   console.log(`Querying semantic scholar offset: ${offset}, and query.author: ${queryAuthor} query.affiliation: ${affiliation} query.filter: ${filter}`)

  //   const url = 'https://api.semanticscholar.org/v1/author/46276642'
  //   // const response = await axios.get(this.dsConfig.queryUrl, {
  //   const response = await axios.get(url, {
  //     headers: {
  //     },
  //     // assumes query is a set of properties for params
  //     params: {
  //       // 'query.author': queryAuthor,
  //       // 'query.affiliation': affiliation,
  //       // 'filter': filter,
  //       // 'rows': pageSize,
  //       // 'offset': offset
  //     }
  //   })

  //   return response.data
  // }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs = []
    await pMap (sourcePublications, async (pub) => {
      const authors = await this.getNormedAuthors(pub)
      console.log(`Normed authors found: ${JSON.stringify(authors, null, 2)}`)
      let normedPub: NormedPublication = {
        title: pub['title'],
        doi: pub['doi'],
        journalTitle: pub['venue'],
        publicationDate: `${pub['year']}`,  // force to be string
        datasourceName: this.getSourceName(),
        sourceId: pub['paperId'],
        authors: authors,
        sourceMetadata: pub
      }
      // add optional properties
      if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
      if (pub['abstract']) _.set(normedPub, 'abstract', pub['abstract'])
      if (pub['url']) normedPub.sourceUrl = pub['url']
      // if (pub['issn-type']) {
      //   _.each(pub['issn-type'], (issn) => {
      //     if (issn['type'] && issn['value']) {
      //       if (issn['type'] === 'electronic') {
      //         _.set(normedPub, 'journalEIssn', issn['value'])
      //       } else {
      //         _.set(normedPub, 'journalIssn', issn['value'])
      //       }
      //     }
      //   })
      // }
      // // console.log(`Created normed pub: ${JSON.stringify(normedPub, null, 2)}`)
      normedPubs.push(normedPub)
    }, { concurrency: 1})

    return _.filter(normedPubs, (pub) => {
      return (pub !== undefined && pub !== null)
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'SemanticScholar'
  }

  getRequestPageSize(): Number {
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {

  }

  getDataSourceConfig() {
    return this.dsConfig
  }

  // returns set of coauthors for a given publication metadata harvested from semantic scholar with attributes like names and ids
  getCoauthors(sourceMetadata) {
    if (sourceMetadata && sourceMetadata['authors']) {
      return sourceMetadata['authors']
    } else {
      return []
    }
  }

  async getCSLStyleAuthorList(sourceMetadata) {
    // const sourceAuthors = this.getCoauthors(sourceMetadata)
    // const cslStyleAuthors = []
    // await pMap(sourceAuthors, async (sourceAuthor, index) => {
    //   let author = _.clone(sourceAuthor)
    //   const parsedName = await nameParser({
    //     name: sourceAuthor['name'],
    //     reduceMethod: 'majority',
    //   });
    //   author['given'] = parsedName.first
    //   author['family'] = parsedName.last
    //   cslStyleAuthors.push(author)
    // }, { concurrency: 1 })
    const normedAuthors: NormedAuthor[] = await this.getNormedAuthors(sourceMetadata)
    return _.map(normedAuthors, (author) => {
      return {
        family: author.familyName,
        given: author.givenName
      }
    })
  }

  async getNormedAuthors(sourceMetadata): Promise<NormedAuthor[]> {
    const sourceAuthors = this.getCoauthors(sourceMetadata)
    const normedAuthors: NormedAuthor[] = []
    await pMap(sourceAuthors, async (sourceAuthor, index) => {
      const parsedName = await nameParser({
        name: sourceAuthor['name'],
        reduceMethod: 'majority',
      });
      // console.log(`Parsed name found is: ${JSON.stringify(parsedName, null, 2)}`)
      let author: NormedAuthor = {
        familyName: parsedName['last'],
        givenName: parsedName['first'],
        givenNameInitial: (parsedName['first'] ? parsedName['first'][0] : ''),
        affiliations: [],
        sourceIds: { semanticScholarIds : [sourceAuthor['authorId']]}
      }
      normedAuthors.push(author)
    }, { concurrency: 1 })
    return normedAuthors
  }

  // returns map of person id to author ids
  async loadPossibleAuthorIdsFromCSV(filePath, personIdKey, authorIdKey){
    const authorIdRows: any = await loadCsv({
      path: filePath,
      lowerCaseColumns: true
    })

    
    let authorIdsByPersonId = {}
    _.each(authorIdRows, (authorIdRow) => {
      const personId = _.toLower(authorIdRow[personIdKey])
      const authorId = _.toLower(authorIdRow[authorIdKey])
      console.log(`Getting personId: ${personId} author id: ${authorId} Author Id Row: ${JSON.stringify(authorIdRow)}`)
      if (personId && authorId){
        if (!authorIdsByPersonId[personId]) {
          authorIdsByPersonId[personId] = []
        }
        if (!_.includes(authorIdsByPersonId[personId], authorId)){
          authorIdsByPersonId[personId].push(authorId)
        }
      }
    })
    console.log(`AuthorIds by person: ${JSON.stringify(authorIdsByPersonId, null, 2)}`)
    return authorIdsByPersonId
  }

  // getAuthorIdsByConfidence(publication, minConfidence) {

  // }
  // matchPeopleToCoauthors(coAuthorList, personMap) {
  //   const conf: CalculateConfidence = new CalculateConfidence()
  //   conf.calculateConfidence()
  // }
  
}