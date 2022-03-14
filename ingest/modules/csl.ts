import _ from 'lodash'
import NormedAuthor from './normedAuthor'
import DateHelper from '../units/dateHelper'
import Cite from 'citation-js'
import pMap from 'p-map'
import CslDate from './cslDate'

export default class Csl {

  cslJson: Object

  constructor (cslJson: Object) {
    this.cslJson = cslJson
  }

  valueOf() {
    if (this.cslJson) {
      return this.cslJson
    }
  }

  setAuthors(authors) {
    if (this.cslJson){
      this.cslJson['author'] = authors
    }
  }

  setDoi(doi) {
    this.cslJson['DOI'] = doi
  }

  public static cslToNormedAuthors (cslAuthors): NormedAuthor[] {
    let normedAuthors: NormedAuthor[] = []
    _.each(cslAuthors, (author) => {
      const normedAuthor: NormedAuthor = {
        familyName: author['family'],
        givenName: author['given'],
        givenNameInitial: (author['given'] && author['given'].length > 0 ? author['given'][0] : ''),
        affiliations: [],
        sourceIds: {}
      }
      normedAuthors.push(normedAuthor)
    })
    return normedAuthors
  }

  public static normedToCslAuthors (normedAuthors: NormedAuthor[]) {
    let authorPosition = 0
    let cslAuthors = []
    _.each(normedAuthors, (normedAuthor) => {
      authorPosition += 1
      const cslAuthor = {
        family: normedAuthor.familyName,
        given: normedAuthor.givenName,
        position: authorPosition
      }
      cslAuthors.push(cslAuthor)
    })
    return cslAuthors
  }

  public static getPublicationYear (cslParent: Csl) : Number {
    // look for both online and print dates, and make newer date win if different
    // put in array sorted by date
    const csl = cslParent.valueOf()
    let years = []

    if (csl) {
      years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
      years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
      years.push(_.get(csl, 'published.date-parts[0][0]', null))
      years.push(_.get(csl, 'issued.date-parts[0][0]', null))
      years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
      years.push(_.get(csl, 'published-online.date-parts[0][0]', null))
  
      years = _.sortBy(years, (year) => { return year === null ?  0 : Number.parseInt(year) }).reverse()
    }

    if (years.length > 0 && years[0] > 0) {
      // return the most recent year
      return years[0]
    } else {
      const item = new Cite(csl)
      const citation = item.format('citation')
      let year = null
      // last item in string is the year after the last comma
      const items = _.split(citation, ',')
  
      if (items.length > 0){
        year = items[items.length - 1]
        // get rid of any parentheses
        year = _.replace(year, ')', '')
        year = _.replace(year, '(', '')
        // remove any whitespace
        return Number.parseInt(_.trim(year))
      } else {
        throw(`Unable to determine publication year from csl: ${JSON.stringify(csl, null, 2)}`)
      }
    }
  
  }

  public static getPublicationDate (csl): CslDate {
    // look for both online and print dates, and make newer date win if different
    // put in array sorted by date
  
    let dates: CslDate[] = []
    const dateBases = [
      'journal-issue.published-print.date-parts[0]',
      'journal-issue.published-online.date-parts[0]',
      'published.date-parts[0]',
      'issued.date-parts[0]',
      'published-print.date-parts[0]',
      'published-online.date-parts[0]'
    ]
    _.each(dateBases, (dateBase) => {
      const year = _.get(csl, `${dateBase}[0]`, null)
      const month = _.get(csl, `${dateBase}[1]`, null)
      const day = _.get(csl, `${dateBase}[2]`, null)
      if (year !== null && !Number.isNaN(year) && _.toLower(year) !== 'nan') {
        const date: CslDate = {
          year: (!Number.isNaN(year) && _.toLower(year) !== 'nan' ? Number.parseInt(year) : undefined),
          month: (month !== null ? Number.parseInt(month) : undefined),
          day: (day !== null ? Number.parseInt(day) : undefined)
        }
        dates.push(date)
      }
    })
  
    // check graph nodes as well
    const graphNodes = _.get(csl, '_graph', [])
    if (graphNodes.length > 0) {
      _.each(graphNodes, (node) => {
        if (node['data'] && _.keys(node['data'].length > 0)) {
          _.each(dateBases, (dateBase) => {
            const year = _.get(csl, `${dateBase}[0]`, null)
            const month = _.get(csl, `${dateBase}[1]`, null)
            const day = _.get(csl, `${dateBase}[2]`, null)
            if (year !== null && !Number.isNaN(year) && _.toLower(year) !== 'nan') {
              const date: CslDate = {
                year: (!Number.isNaN(year) && _.toLower(year) !== 'nan' ? Number.parseInt(year) : undefined),
                month: (month !== null ? Number.parseInt(month) : undefined),
                day: (day !== null ? Number.parseInt(day) : undefined)
              }
              dates.push(date)
            }
          })
        }
      })
    }
  
    dates = _.sortBy(dates, (date: CslDate) => { 
      let year = date.year
      let month = (date.month ? date.month : 1)
      let day = (date.day ? date.day : 1)
      return DateHelper.getDateObject(`${year}-${month}-${day}`).getTime()
    }).reverse()
    if (dates.length > 0) {
      // return the most recent year
      return dates[0]
    } else {
      return null
    }
  }
  

  public static async getCslAuthors(csl: Csl): Promise<any[]> {
    const authMap = {
      firstAuthors : [],
      otherAuthors : []
    }
  
    let authorCount = 0
      if (csl && csl.valueOf() && csl.valueOf()['author']){
      // console.log(`iterating of csl: ${JSON.stringify(csl)}`)
      // console.log(`Before author is: ${JSON.stringify(csl.valueOf()['author'], null, 2)}`)
      await pMap(csl.valueOf()['author'], async (author: any) => {
        // skip if family_name undefined
        // console.log(`During author is: ${JSON.stringify(author, null, 2)}`)
        if (author.family != undefined){
          authorCount += 1

          //if given name empty change to empty string instead of null, so that insert completes
          if (author.given === undefined) author.given = ''
          
          if (_.lowerCase(author.sequence) === 'first' ) {
            authMap.firstAuthors.push(author)
          } else {
            authMap.otherAuthors.push(author)
          }
        }
      }, { concurrency: 1})
    }
  
    //add author positions
    authMap.firstAuthors = _.forEach(authMap.firstAuthors, function (author, index){
      author.position = index + 1
    })
  
    authMap.otherAuthors = _.forEach(authMap.otherAuthors, function (author, index){
      author.position = index + 1 + authMap.firstAuthors.length
    })
  
    //concat author arrays together
    const authors = _.concat(authMap.firstAuthors, authMap.otherAuthors)
  
    return authors
  }

  // tested to accept a doi or bibtex
  public static async getCsl(inputStr): Promise<Csl> {
    let cslRecords = undefined
    let csl = undefined
    //get CSL (citation style language) record by doi from dx.dio.org
    cslRecords = await Cite.inputAsync(inputStr)
    if (cslRecords && cslRecords.length > 0) {
      csl = cslRecords[0]
      const cslObj = new Csl(csl)
      return cslObj
    } else {
      throw(`Unable to generate CSL for input str: '${inputStr}'`)
    }
  }

}