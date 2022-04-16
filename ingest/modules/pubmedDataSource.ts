import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
const xmlToJson = require('xml-js');
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
import NormedAuthor from './normedAuthor'
import HarvestSet from './HarvestSet'
import DataSource from './dataSource'
import DateHelper from '../units/dateHelper'
import { wait } from '../units/randomWait';
import DataSourceConfig from './dataSourceConfig'
import pMap from 'p-map'
import DataSourceHelper from './dataSourceHelper';
import ApolloClient from 'apollo-client';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { HarvestOperation } from './harvestOperation';

const nameParser = require('../units/nameParser').command;
export class PubMedDataSource implements DataSource {

  private dsConfig: DataSourceConfig

  constructor (dsConfig?: DataSourceConfig) {
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

  async getNormedAuthorsFromSourceMetadata(sourceMetadata): Promise<NormedAuthor[]> {
    const authors: NormedAuthor[] = []
    if (sourceMetadata && sourceMetadata['creators']){
      _.each(sourceMetadata['creators'], (creator) => {
        const author: NormedAuthor = {
          familyName: creator['familyName'],
          givenName: creator['givenName'],
          givenNameInitial: (creator['givenName'] && creator['givenName'][0] ? creator['givenName'][0]: ''),
          affiliations: [creator['affiliation']],
          sourceIds: {}
        }
      return author
      })
    }
    return authors
  }

  async getCSLStyleAuthorList(sourceMetadata) {
    const sourceAuthors: NormedAuthor[] = await this.getNormedAuthorsFromSourceMetadata(sourceMetadata)
    const cslStyleAuthors = []
    await pMap(sourceAuthors, async (sourceAuthor, index) => {
      let author = {}
      author['given'] = sourceAuthor.givenName
      author['family'] = sourceAuthor.familyName
      author['position'] = index + 1
      author['sequence'] = (index > 0 ? 'additional' : 'first')
      if (sourceAuthor.affiliations && sourceAuthor.affiliations.length > 0) {
        author['affiliation'] = [{
          name: sourceAuthor.affiliations
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
    const mappedOverObject = await pMap(sourcePublications, async (pub) => {
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
        publishedYear: pub.publicationYear,
        datasourceName: 'PubMed',
        sourceId: pubmedId,
        authors: await this.getNormedAuthorsFromSourceMetadata(pub),
        sourceMetadata: pub
      }

      if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
      if (pub['description']) _.set(normedPub, 'abstract', pub['description'])
      normedPubs.push(normedPub)
    }, { concurrency: 1 })
    return normedPubs
  }

  //returns a machine readable string version of this source
  getSourceName() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'PubMed'
  }

  getRequestPageSize(): Number {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {
  }

  getDataSourceConfig() {
    return this.dsConfig
  }

  async getHarvestOperations(client: ApolloClient<NormalizedCacheObject>): Promise<HarvestOperation[]> {
    let harvestOperations: HarvestOperation[] = []
    // not doing anything for now
    return harvestOperations
  }
  
}