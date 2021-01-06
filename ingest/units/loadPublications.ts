import _ from 'lodash'
import { command as loadCsv } from './loadCsv'

export async function loadPublications (csvPath: string) {
  console.log(`Loading Papers from path: ${csvPath}`)
  // ingest list of DOI's from CSV and relevant center author name
  try {
    const authorPapers: any = await loadCsv({
     path: csvPath,
     lowerCaseColumns: true
    })

    const papersByDoi = _.groupBy(authorPapers, function(paper) {
      // strip off 'doi:' if present
      return _.replace(paper['doi'], 'doi:', '')
    })
    
    return papersByDoi
  } catch (error){
    console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
    return undefined
  }
}