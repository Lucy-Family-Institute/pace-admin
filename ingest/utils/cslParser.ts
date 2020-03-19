import Cite from 'citation-js'

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

module.exports = {
  command: (input) => fetchByDoi(input.doi),
};
// module.exports = {
//   fetchByDoi,
//   parseCsl
// }