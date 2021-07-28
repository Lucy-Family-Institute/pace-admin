import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
const xmlToJson = require('xml-js');
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import HarvestSet from './HarvestSet'
import DataSource from './dataSource'
import { getDateString, getDateObject } from '../units/dateRange'
import { wait } from '../units/randomWait';
import DataSourceConfig from './dataSourceConfig'
import pMap from 'p-map'

const nameParser = require('../units/nameParser').command;
export class PubMedDataSource implements DataSource {

  private dsConfig: DataSourceConfig

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  getAuthorQuery(person: NormedPerson){
    //TODO
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    //TODO
    return undefined
  }

  getAuthors(sourceMetadata) {
    let authors = []
    authors = _.concat(authors, sourceMetadata['creators'])
    return authors
  }

  getNormedAuthors(sourceMetadata): NormedAuthor[] {
    const authors = this.getAuthors(sourceMetadata)
    return _.map(authors, (author) => {
      return {
        familyName: author.familyName,
        givenName: author.givenName,
        givenNameInitial: (author.givenName ? author.giveName[0]: ''),
        affiliations: author.affiliations,
        sourceIds: {}
      }
    })
  }

  async getCSLStyleAuthorList(sourceMetadata) {
    const sourceAuthors = this.getAuthors(sourceMetadata)
    const cslStyleAuthors = []
    await pMap(sourceAuthors, async (sourceAuthor, index) => {
      let author = {}
      author['given'] = sourceAuthor.givenName
      author['family'] = sourceAuthor.familyName
      author['position'] = index + 1
      author['sequence'] = (index > 0 ? 'additional' : 'first')
      if (sourceAuthor.affiliation && sourceAuthor.affiliation.length > 0) {
        author['affiliation'] = [{
          name: sourceAuthor.affiliation
        }]
      }
      cslStyleAuthors.push(author)
    }, { concurrency: 1 })
    return cslStyleAuthors
  }

  // return map of identifier type to id
  getResourceIdentifiers (resourceIdentifiers) {
    console.log(`Keying resource identifiers by type: ${JSON.stringify(resourceIdentifiers, null,2)}`)
    return _.keyBy(resourceIdentifiers, 'resourceIdentifierType')
  }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs = []
    const mappedOverObject = _.each(sourcePublications, (pub) => {
      const title = pub.title;
      // console.log(`Pubmed pub is: ${JSON.stringify(jsonObj, null, 2)}`)
      // console.log(`Before ubmed pub is: ${JSON.stringify(beforeJsonObj, null, 2)}`)

      const identifiers = this.getResourceIdentifiers(pub.resourceIdentifiers)
      // console.log(`Processing Pub: ${JSON.stringify(pub, null, 2)}`)
      // console.log(`Found Resource Identifiers for Title: ${title} ids: ${JSON.stringify(identifiers, null, 2)}`)
      // let creators = ''
      // // const mappedData = await pMap(pub.creators, async (creator, index) => {

      // //   if (index > 0) {
      // //     creators = `${creators};`
      // //   }
      // //   creators = `${creators}${creator.familyName}, ${creator.givenName}`
      // // }, { concurrency: 1 });

      // const parsedName = await nameParser({
      //   name: `${pub.creators[0].givenName} ${pub.creators[0].familyName}`,
      //   reduceMethod: 'majority',
      // });
      
      let doi = identifiers.doi ? identifiers.doi.resourceIdentifier : ''
      let pubmedId = identifiers.pubmed ? identifiers.pubmed.resourceIdentifier: ''
      console.log(`Creating normed pub for doi: ${doi} pubmed id: ${pubmedId}`)
      // update to be part of NormedPublication
      let normedPub: NormedPublication = {
        title: title,
        journalTitle: '',
        doi: doi,
        publicationDate: pub.publicationYear,
        datasourceName: 'PubMed',
        sourceId: pubmedId,
        authors: this.getNormedAuthors(pub),
        sourceMetadata: pub
      }

      if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
      if (pub['description']) _.set(normedPub, 'abstract', pub['description'])
      normedPubs.push(normedPub)
    })
    return normedPubs
  }

  //returns a machine readable string version of this source
  getSourceName() {
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'PubMed'
  }

  getRequestPageSize(): Number {
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {
  }

  getDataSourceConfig() {
    return this.dsConfig
  }
  
}