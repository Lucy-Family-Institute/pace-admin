import _ from 'lodash'
import { command as loadCsv } from './loadCsv'

/**
 * 
 * @param csvPath the path the csv file containing the publications to be loaded
 * 
 * @param columnNameMap a map of column names in the csv to harvestset property names
 * 
 * @returns object with array of raw publication set as well as hash of doi to index of corresponding publication in array
 */
export async function loadPublications (csvPath: string, columnNameMap={}): Promise<NormedPublication[]> {
  console.log(`Loading Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const authorPapers: any = await loadCsv({
      path: csvPath,
      lowerCaseColumns: true,
      columnNameMap: columnNameMap
    })

    let sourceName = undefined
    if (authorPapers.length > 0){
      sourceName = authorPapers[0]['sourcename']
    }

    return _.map(authorPapers, (paper) => {
      let pub: NormedPublication = {
        title: paper['title'],
        journalTitle: paper['journaltitle'],
        doi: _.replace(paper['doi'], 'doi:', ''),
        publicationDate: paper['publicationdate'],
        datasourceName: paper['datasourcename'],
        sourceId: paper['sourceid']
      }
      if (paper['searchperson']) {
        _.set(pub, 'searchPerson', paper['searchperson'])
      } else if (paper['searchpersonfamilyname']) {
        const person: NormedPerson = {
          id: Number.parseInt(paper['searchpersonid']),
          familyName: paper['searchpersonfamilyname'],
          givenName: paper['searchpersongivenname'],
          givenNameInitial: paper['searchpersongivennameinitial'],
          startDate: (paper['searchpersonstartdate'] ? new Date(paper['searchpersonstartdate']) : undefined),
          endDate: (paper['searchpersonenddate'] ? new Date(paper['searchpersonenddate']) : undefined),
          sourceIds: (paper['searchpersonsourceidsscopusaffiliationid'] ? 
            { scopusAffiliationId: paper['searchpersonsourceidsscopusaffiliationid'] } : {})
        }
        _.set(pub, 'searchPerson', person)
      }
      if (paper['abstract']) {
        _.set(pub, 'abstract', paper['abstract'])
      }
      if (paper['journalissn']) {
        _.set(pub, 'journalIssn', paper['journalissn'])
      }
      if (paper['journaleissn']) {
        _.set(pub, 'journalEIssn', paper['journaleissn'])
      }
      if (paper['sourcemetadata']) {
        // parse and get rid of any escaped quote characters
        const sourceMetadata = JSON.parse(paper['sourcemetadata'])
        _.set(pub, 'sourceMetadata', sourceMetadata)
      }
      return pub
    })
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}