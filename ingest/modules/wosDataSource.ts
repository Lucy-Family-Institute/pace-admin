import axios, { AxiosResponse } from 'axios'
import _ from 'lodash'
const xmlToJson = require('xml-js');
import NormedPublication from './normedPublication'

export class WosDataSource implements DataSource {

  private dsConfig: DataSourceConfig
  private sessionId: string 

  constructor (dsConfig: DataSourceConfig) {
    this.dsConfig = dsConfig
  }

  // return the query passed to scopus for searching for given author
  getAuthorQuery(person: NormedPerson){
    let authorQuery = `AU = (${person.familyName}, ${person.givenName}) AND OG = (University of Notre Dame) `
    return authorQuery
  }

  getWoSQuerySOAPString(query, startDate, endDate) {
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
                                <begin>2015-01-01</begin>\
                                <end>2020-12-31</end>\
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
                                <firstRecord>${offset}</firstRecord>\
                                <count>${limit}</count>\
                              </retrieveParameters>\
                            </ns2:retrieve>\
                          </soap:Body>\
                        </soap:Envelope>`
    // console.log(`soap string is: ${soapRetrieve}`)
    return soapRetrieve
  }

  async getWoSData(sessionId, query, startDate, endDate) {

    const soapQueryString = this.getWoSQuerySOAPString(query, startDate, endDate)
    const baseUrl = 'http://search.webofknowledge.com/esti/wokmws/ws/WokSearchLite'
    const response = await axios.post(baseUrl, soapQueryString,
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
  
  async retrieveWoSAuthorResults(sessionId, queryId, offset) {
    const soapRetrieveString = this.getWoSRetrieveRecordString(queryId, offset, 100)
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
  async getPublicationsByAuthorName(person: NormedPerson, offset: Number, startDate: Date, endDate?: Date): Promise<HarvestSet> {
    const authorQuery = this.getAuthorQuery(person)
    const soapQueryString = this.getWoSQuerySOAPString(authorQuery, startDate, endDate)

    let totalResults: Number
    let publications = []

    // scopus accepts only year for date search
    let dateFilter = `${startDate.getFullYear()}`
    // if (endDate) {
    //   //add end date to range if provided
    //   dateFilter = `${dateFilter}-${endDate.getFullYear()}`
    // }

    // // need to make sure date string in correct format
    // const results = await this.fetchQuery(soapQueryString, dateFilter, this.dsConfig.pageSize, offset)
    // if (results && results['search-results']['opensearch:totalResults']){
    //     totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
    //     if (totalResults > 0 && results['search-results']['entry']){
    //         publications = results['search-results']['entry']
    //     }
    // } else {
    //   totalResults = 0
    // }
    const result: HarvestSet = {
        sourceName: this.getSourceName(),
        searchPerson: person,
        query: authorQuery,
        sourcePublications: publications,
        offset: offset,
        pageSize: Number.parseInt(this.dsConfig.pageSize),
        totalResults: totalResults
    }

    return result
  }

  async fetchQuery(sessionId, query, date, pageSize, offset) : Promise<any>{
    console.log(`Querying Web of Science with date: ${date}, offset: ${offset}, and query: ${query}`)

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

  // returns an array of normalized publication objects given ones retrieved fron this datasource
  getNormedPublications(sourcePublications: any[], searchPerson?: NormedPerson): NormedPublication[]{
    return _.map(sourcePublications, (pub) => {
        let normedPub: NormedPublication = {
            title: pub['dc:title'],
            journalTitle: pub['prism:publicationName'],
            publicationDate: pub['prism:coverDate'],
            datasourceName: this.dsConfig.sourceName,
            doi: pub['prism:doi'] ? pub['prism:doi'] : '',
            sourceId: _.replace(pub['dc:identifier'], 'SCOPUS_ID:', ''),
            sourceMetadata: pub
        }
        // add optional properties
        if (searchPerson) _.set(normedPub, 'searchPerson', searchPerson)
        if (pub['abstract']) _.set(normedPub, 'abstract', pub['abstract'])
        if (pub['prism:issn']) _.set(normedPub, 'journalIssn', pub['prism:issn'])
        if (pub['prism:eIssn']) _.set(normedPub, 'journalEIssn', pub['prism:eIssn'])
        return normedPub
    })
  }

  //returns a machine readable string version of this source
  getSourceName() {
    return (this.dsConfig && this.dsConfig.sourceName) ? this.dsConfig.sourceName : 'WebOfScience'
  }

  getRequestPageSize(): Number {
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
  
}