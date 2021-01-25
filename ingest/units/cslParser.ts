import Cite from 'citation-js'
import _ from 'lodash'

//takes in a DOI and returns a json object formatted according to CSL (citation style language)
//https://citation.js.org/api/index.html
export default async function fetchByDoi(doi) {
  //initalize the doi query and citation engine
  Cite.async()

  //get CSL (citation style language) record by doi from dx.dio.org
  const cslRecords = await Cite.inputAsync(doi)
  //console.log(`For DOI: ${doi}, Found CSL: ${JSON.stringify(cslRecords,null,2)}`)

  return cslRecords[0]
}

//returns a new csl json object based on the cslString passed in
export function parseCsl (cslString){
  return new Cite(JSON.parse(cslString))
}

export function getAuthors(publicationCsl: Cite){
  const authMap = {
    firstAuthors : [],
    otherAuthors : []
  }

  let authorCount = 0
  //console.log(`Before author loop paper csl: ${JSON.stringify(publicationCsl,null,2)}`)
  _.each(publicationCsl.author, async (author) => {
    // skip if family_name undefined
    if (author.family != undefined){
      //console.log(`Adding author ${JSON.stringify(author,null,2)}`)
      authorCount += 1

      //if given name empty change to empty string instead of null, so that insert completes
      if (author.given === undefined) author.given = ''

      if (_.lowerCase(author.sequence) === 'first' ) {
        //console.log(`found first author ${ JSON.stringify(author) }`)
        authMap.firstAuthors.push(author)
      } else {
        //console.log(`found add\'l author ${ JSON.stringify(author) }`)
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

  //console.log(`Author Map found: ${JSON.stringify(authMap,null,2)}`)
  return authors
}

function getAuthorsByLastName (publicationCsl: Cite) {
  //retrieve the authors from the record and put in a map, returned above in array, but really just one element
  const authors = getAuthors(publicationCsl)
  // group authors by last name
  //create map of last name to array of related persons with same last name
  const authorMap = _.transform(authors, function (result, value) {
    const lastName = _.toLower(value.family)
    return (result[lastName] || (result[lastName] = [])).push(value)
  }, {})
  return authorMap
}