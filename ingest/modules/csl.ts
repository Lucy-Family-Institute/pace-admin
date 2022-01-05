import _ from 'lodash'
import NormedAuthor from './normedAuthor'
import Cite from 'citation-js'

export default class Csl {

  cslJson: Object

  constructor (cslJson: Object) {
    this.cslJson = cslJson
  }

  valueOf() {
    return this.cslJson
  }

  setAuthors(authors) {
    this.cslJson['author'] = authors
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
    years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
    years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
    years.push(_.get(csl, 'published.date-parts[0][0]', null))
    years.push(_.get(csl, 'issued.date-parts[0][0]', null))
    years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
    years.push(_.get(csl, 'published-online.date-parts[0][0]', null))
  
    years = _.sortBy(years, (year) => { return year === null ?  0 : Number.parseInt(year) }).reverse()
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

  public static getCslAuthors(csl: Csl): any[] {
    const authMap = {
      firstAuthors : [],
      otherAuthors : []
    }
  
    let authorCount = 0
    _.each(csl.valueOf()['author'], async (author) => {
      // skip if family_name undefined
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
    })
  
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
    //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)
    csl = cslRecords[0]
    const cslObj = new Csl(csl)
    return cslObj
  }

}