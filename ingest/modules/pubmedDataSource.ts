import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
const xmlToJson = require('xml-js');
import NormedPublication from './normedPublication'
import NormedPerson from './normedPerson'
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

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): NormedPublication[]{
    // TODO
    return []
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