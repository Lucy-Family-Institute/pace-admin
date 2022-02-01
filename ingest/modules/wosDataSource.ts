import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
const xmlToJson = require('xml-js');
import NormedPublication from './normedPublication'
import NormedAuthor from './normedAuthor'
import NormedPerson from './normedPerson'
import HarvestSet from './HarvestSet'
import DataSource from './dataSource'
import { getDateString, getDateObject } from '../units/dateRange'
import { wait } from '../units/randomWait';
import DataSourceConfig from './dataSourceConfig'
import pMap from 'p-map'
import DataSourceHelper from './dataSourceHelper';

const nameParser = require('../units/nameParser').command;
export class WosDataSource implements DataSource {

  private dsConfig: DataSourceConfig
  private sessionId: string 

  constructor (dsConfig?: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  getAuthorQuery(person: NormedPerson){
    let authorQuery = `AU = (${person.familyName}, ${person.givenName}) AND OG = (University of Notre Dame)`
    return authorQuery
  }

  /**
   * 
   * @param query 
   * @param startDate 
   * @param endDate 
   * @returns The soap query string
   */
  getWoSQuerySOAPString(query, startDate: Date, endDate: Date) {
    let startDateString = getDateString(startDate)
    let endDateString = undefined
    // if no end date defined default to the end of the year of the start date
    if (!endDate) {
      endDateString = `${startDate.getFullYear()}-12-31`
    } else {
      endDateString = getDateString(endDate)
    }
    let soapquery = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\
                      xmlns:woksearchlite="http://woksearchlite.v3.wokmws.thomsonreuters.com">\
                      <soapenv:Header/>\
                      <soapenv:Body>\
                        <woksearchlite:search>\
                          <queryParameters>\
                              <databaseId>WOS</databaseId>\
                              <userQuery>${query}</userQuery>\
                              <editions>\
                                <collection>WOS</collection>\
                                <edition>SCI</edition>\
                              </editions>\
                              <timeSpan>\
                                <begin>${startDateString}</begin>\
                                <end>${endDateString}</end>\
                              </timeSpan>\
                              <queryLanguage>en</queryLanguage>\
                          </queryParameters>\
                          <retrieveParameters>\
                              <firstRecord>1</firstRecord>\
                              <count>0</count>\
                          </retrieveParameters>\
                        </woksearchlite:search>\
                      </soapenv:Body>\
                    </soapenv:Envelope>`
    return soapquery
  }

  getWoSRetrieveRecordString(queryId, offset, limit) {
    let soapRetrieve = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\
                          <soap:Body>\
                            <ns2:retrieve xmlns:ns2="http://woksearchlite.v3.wokmws.thomsonreuters.com">\
                              <queryId>${queryId}</queryId>\
                              <retrieveParameters>\
                                <firstRecord>${offset+1}</firstRecord>\
                                <count>${limit}</count>\
                              </retrieveParameters>\
                            </ns2:retrieve>\
                          </soap:Body>\
                        </soap:Envelope>`
    // console.log(`soap string is: ${soapRetrieve}`)
    return soapRetrieve
  }
  
  async retrieveWoSAuthorResults(sessionId, queryId, offset) {
    console.log(`Retrieving results for queryId: ${queryId} from ${this.getSourceName()}`)
    const soapRetrieveString = this.getWoSRetrieveRecordString(queryId, offset, this.getRequestPageSize())
    const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
    const response = await axios.post(baseUrl, soapRetrieveString,
      {
        headers: {
          'Cookie': sessionId,
          'content-type' : 'application/json'// 'text/xml;charset=UTF-8'
        }
      }
    ).catch(err=>{console.log(err)})
    const jsonData =  xmlToJson.xml2js(response['data'], {compact:true});    
    return jsonData
  }

  // assumes that if only one of startDate or endDate provided it would always be startDate first and then have endDate undefined
  async getPublicationsByAuthorName(person: NormedPerson, sessionState: {}, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)

    const authorQuery = this.getAuthorQuery(person)
   
    let totalResults: Number
    let publications = []

    await wait(this.dsConfig.requestInterval)

    if (!this.getSessionId()){
      await this.initialize()
    }

    let queryId = (sessionState && sessionState['queryId']) ? sessionState['queryId'] : undefined
    totalResults = (sessionState && sessionState['totalResults']) ? sessionState['totalResults'] : undefined
    // on first call do query and get query id and total results
    if (!queryId || !totalResults){
      const soapQueryString = this.getWoSQuerySOAPString(authorQuery, startDate, endDate)
      await wait(this.dsConfig.requestInterval)
      const results = await this.fetchQuery(this.getSessionId(), soapQueryString)
      queryId = results['soap:Envelope']['soap:Body']['ns2:searchResponse'].return.queryId._text
      totalResults = Number.parseInt(results['soap:Envelope']['soap:Body']['ns2:searchResponse'].return.recordsFound._text)
      sessionState['queryId'] = queryId
      sessionState['totalResults'] = totalResults
    }

    await wait(this.dsConfig.requestInterval)

    // once query id and total results known retrieve corresponding results given offset
    const results = await this.retrieveWoSAuthorResults(this.getSessionId(), queryId, offset)
    
    const recordsFound = Number.parseInt(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse']['return']['recordsFound']._text ? results['soap:Envelope']['soap:Body']['ns2:retrieveResponse']['return']['recordsFound']._text : '0')
    if (recordsFound && recordsFound > 0) {
      if (!Array.isArray(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records)){
        // not returned as array if only one
        publications.push(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records)
      } else {
        _.each(results['soap:Envelope']['soap:Body']['ns2:retrieveResponse'].return.records, (record) => {
          if (record && record != null) {
            publications.push(record)
          }
        })
      }
    }
    
    const result: HarvestSet = {
        sourceName: this.getSourceName(),
        searchPerson: person,
        sessionState: sessionState,
        query: authorQuery,
        sourcePublications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: totalResults
    }

    return result
  }

  async fetchQuery(sessionId, query) : Promise<any>{
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)

    console.log(`Querying ${this.getSourceName()} with query: ${query}`)

    //const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
    const response = await axios.post(this.dsConfig.queryUrl, query,
      {
        headers: {
          'Cookie': sessionId,
          'content-type' : 'application/json'// 'text/xml;charset=UTF-8'
        }
      }
    ).catch(err=>{console.log(err)})
    const jsonData =  xmlToJson.xml2js(response['data'], {compact:true});
    return jsonData
  }

  /**
   * 
   * @param properties 
   * @returns Takes an array of objects of form [element 1, element 2] where
   * element is of form {"label": {_text: "property_name"}, "value": {actual_value}}
   * to form [property_name:actual_value]
   */
  getWoSMapLabelsToValues(properties) {
    let transformedProperties = {}
    console.log(`properties are: ${JSON.stringify(properties, null, 2)}`)
    let parseProperties = properties
    if (!_.isArray(properties)){
      parseProperties = [properties]
    }
    _.each(parseProperties, (property) => {
      transformedProperties[property['label']['_text']] = property['value']
    })
    return transformedProperties
  }

  getAuthors(sourceMetadata) {
    console.log(`Getting authors from source metadata: ${JSON.stringify(sourceMetadata, null, 2)}`)
    let authors = []
    if (sourceMetadata && sourceMetadata['authors']){
      const sourceAuthors = this.getWoSMapLabelsToValues(sourceMetadata['authors'])
      if (sourceAuthors['Authors'] && sourceAuthors['Authors'].length > 0){
        _.each(sourceAuthors['Authors'], (author) => {
          authors.push({name: author['_text']})
        })
      }
    }
    return authors
  }

  async getCSLStyleAuthorList(sourceMetadata): Promise<any[]> {
    const sourceAuthors = this.getAuthors(sourceMetadata)
    console.log(`source authors are: ${JSON.stringify(sourceAuthors, null, 2)}`)
    const cslStyleAuthors = []
    await pMap (sourceAuthors, async (sourceAuthor, index) => {
      let author = {}
      const parsedName = await nameParser({
        name: sourceAuthor['name'],
        reduceMethod: 'majority',
      });
      author['given'] = parsedName.first
      author['family'] = parsedName.last
      cslStyleAuthors.push(author)
    }, { concurrency: 1 })
    return cslStyleAuthors
  }

  async getNormedAuthorsFromSourceMetadata(sourceMetadata): Promise<NormedAuthor[]> {
    const cslAuthors = await this.getCSLStyleAuthorList(sourceMetadata)
    console.log(`CSL authors are: ${JSON.stringify(cslAuthors, null, 2)}`)
    const normedAuthors: NormedAuthor[] = []
    _.each(cslAuthors, (sourceAuthor, index) => {
      let author: NormedAuthor = {
        familyName: sourceAuthor.family,
        givenName: sourceAuthor.given,
        givenNameInitial: sourceAuthor.given[0],
        affiliations: sourceAuthor.affiliation,
        sourceIds: { }
      }
      normedAuthors.push(author)
    })
    console.log(`Normed authors are: ${JSON.stringify(normedAuthors, null, 2)}`)
    return normedAuthors
  }

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  async getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): Promise<NormedPublication[]>{
    let normedPubs = []
    await pMap (sourcePublications, async (pub) => {
      const otherProps = this.getWoSMapLabelsToValues(pub['other'])
      const sourceProps = this.getWoSMapLabelsToValues(pub['source'])
      
        let normedPub: NormedPublication = {
            title: pub['title'] && pub['title']['value'] && pub['title']['value']['_text'] ? pub['title']['value']['_text'] : '',
            journalTitle: sourceProps && sourceProps['SourceTitle'] && sourceProps['SourceTitle']['_text'] ? sourceProps['SourceTitle']['_text'] : '',
            publicationDate: sourceProps && sourceProps['Published.BiblioYear'] && sourceProps['Published.BiblioYear']['_text'] ? sourceProps['Published.BiblioYear']['_text'] : '',
            datasourceName: this.getSourceName(),
            doi: otherProps && otherProps['Identifier.Doi'] && otherProps['Identifier.Doi']['_text'] ? otherProps['Identifier.Doi']['_text'] : '',
            sourceId: pub['uid'] && pub['uid']['_text'] ? `${Number.parseInt(_.replace(pub['uid']['_text'], 'WOS:', ''))}` : '',
            authors: await this.getNormedAuthorsFromSourceMetadata(pub),
            sourceMetadata: pub
        }
        // add optional properties
        if (searchPerson){
          console.log(`Setting search person ${searchPerson.familyName} with start date: ${JSON.stringify(searchPerson.startDate, null, 2)}`)
          _.set(normedPub, 'searchPerson', searchPerson)
        } 
        // don't worry about abstract for now
        if (otherProps && otherProps['Identifier.Issn'] && otherProps['Identifier.Issn']['_text']) _.set(normedPub, 'journalIssn', otherProps['Identifier.Issn']['_text'])
        if (otherProps && otherProps['Identifier.Eissn'] && otherProps['Identifier.Eissn']['_text']) _.set(normedPub, 'journalEIssn', otherProps['Identifier.Eissn']['_text'])
        
        if (sourceProps && sourceProps['Issue'] && sourceProps['Issue']['_text']) _.set(normedPub, 'number', sourceProps['Issue']['_text'])
        if (sourceProps && sourceProps['Volume'] && sourceProps['Volume']['_text']) _.set(normedPub, 'volume', sourceProps['Volume']['_text'])
        if (sourceProps && sourceProps['Pages'] && sourceProps['Pages']['_text']) _.set(normedPub, 'pages', sourceProps['Pages']['_text'])
        normedPubs.push(normedPub)
    }, { concurrency: 1 })
    return normedPubs
  }

  //returns a machine readable string version of this source
  getSourceName() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'WebOfScience'
  }

  getRequestPageSize(): Number {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    return Number.parseInt(this.dsConfig.pageSize)
  }

  async initialize() {
    this.sessionId = await this.wosAuthenticate()
  }

  getSessionId() {
    return this.sessionId
  }

  // return the session id
  async wosAuthenticate() {
    // must check that config is initialized
    DataSourceHelper.checkDataSourceConfig(this)
    const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WOKMWSAuthenticate'
    //encode authstring in base64, need to send as bytes, not character
    if (!this.dsConfig.userName || !this.dsConfig.password) {
      throw('Username or password undefined for Web of Science connection')
    }
    const authString = `${this.dsConfig.userName}:${this.dsConfig.password}`
    console.log(`auth info: ${authString}`)
    const authB64 = Buffer.from(authString).toString('base64')

    let soapAuthenticate = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\
                              xmlns:auth="http://auth.cxf.wokmws.thomsonreuters.com">\
                              <soapenv:Header/>\
                              <soapenv:Body>\
                                <auth:authenticate/>\
                              </soapenv:Body>\
                            </soapenv:Envelope>'

    //sessionid=authenticationresponse.headers.get('Set-Cookie')
    const response = await axios.post(baseUrl, soapAuthenticate,
      {
        headers: {
          'Authorization': `Basic ${authB64}`,
          'SOAPAction': '',
          'content-type' : 'text/xml;charset=UTF-8'
        }
      }
    ).catch(err=>{console.log(err)})
    let cookie = response['headers']['set-cookie'][0]
    // if (_.startsWith(cookie, 'SID=')) {
    //   cookie = cookie.substr(4)
    // }
    // console.log(cookie)
    return cookie
  }

  getDataSourceConfig() {
    return this.dsConfig
  }
}