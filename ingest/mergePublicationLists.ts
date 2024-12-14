import _ from 'lodash'
import moment from 'moment'
// import fs from 'fs'
// import pMap from 'p-map'
// import path from 'path'
import { command as loadCsv } from './units/loadCsv'
import { command as writeCsv} from './units/writeCsv'
// import { wait } from './units/randomWait'
// import writeToJSONFile from './units/writeToJSONFile'
import FsHelper from './units/fsHelper'
// import Csl from './modules/csl'
// import CslDate from './modules/cslDate'

// import fetch from 'node-fetch'
import dotenv from 'dotenv'


dotenv.config({
  path: '../.env'
})

// environment variables
process.env.NODE_ENV = 'development';

// // if default to bibtex is true then it skips retrieval by doi, and constructs the csl from bibtex
// async function getCsl (doi: string): Promise<Csl> {
//   // let cslRecords = undefined
//   let csl: Csl = undefined
//   try {
//     csl = await Csl.getCsl(doi)
//     // console.log(`Csl is: ${JSON.stringify(csl, null, 2)}`)
//   } catch (error) {
//     console.log(`Error on get csl: ${error}`)
//     // throw (error)
//   }
//   return csl 
// }

export interface NormedCSVPub {
  authors: [string],
  title: string,
  year: number,
  source_names: [string],
  google_scholar_id: string,
  doi: string,
  authorList: string,
  journal: string,
  journalVolumeCitationString: string,
  overWritten: boolean
}

export interface NormedCSVRow {
  authors: string,
  title: string,
  year: number,
  source_names: [string],
  google_scholar_id: string,
  doi: string,
  journal: string,
  citation: string,
  overWritten: boolean
}



function normalizeGoogleScholarRecord (gScholarRecord) {
  // omit last one with year added
  const citationParts = _.split(gScholarRecord['article_publication'], ',')
  let citationString = ''
  const partsNum = citationParts.length
  let counter = 1
  _.each(citationParts, (part) => {
    if (counter == 1){
      citationString = `${part}`
    } else if (counter < partsNum){
      citationString = `${citationString},${part}`
    }
    counter = counter + 1
  })
  const row: NormedCSVPub = {
    authors: [gScholarRecord['authors']],
    title: gScholarRecord['title'],
    year: _.toInteger(gScholarRecord['year']),
    source_names: ['GoogleScholar'],
    google_scholar_id: gScholarRecord['google_Scholar_id'],
    doi: '',
    authorList: getNormedAuthorListGScholar(gScholarRecord['article_authors']),
    journal: '',
    journalVolumeCitationString: citationString,
    overWritten: false
  }
  return row
}

function getNormedAuthorListGScholar(gScholarAuthorList) {
  const authors = _.split(gScholarAuthorList, ',')
  let newAuthorList = []
  _.each(authors, (author) => {
    const authorParts = _.split(_.trim(author), ' ')
    const initials = authorParts[0]
    const familyName = authorParts[1]
    let newAuthor = `${familyName}`
    if (initials.length > 1) {
      newAuthor = `${newAuthor}, `
      _.each(initials, (initial) => {
        newAuthor = `${newAuthor}${initial}.`
      })
    }
    newAuthorList.push(newAuthor)
  })
  let newAuthorListString = ''
  let counter = 0
  _.each(newAuthorList, (newAuthor) => {
    if (counter > 0) {
      newAuthorListString = `${newAuthorListString}, `
    }
    newAuthorListString = `${newAuthorListString}${newAuthor}`
    counter = counter + 1
  })
  return newAuthorListString
}

function findCaseInsensitive(str, substr) {
  const lowerStr = _.toLower(str);
  const lowerSubstr = _.toLower(substr);

  const position = lowerStr.indexOf(lowerSubstr);
  return position !== -1 ? position : undefined;
}

function getGoogleScholarId(sourceString) {
  const sourceIdStrings = _.split(sourceString, ';')
  let googleScholarId
  _.each(sourceIdStrings, (sourceIdString) => {
    const positionId = findCaseInsensitive(sourceIdString, 'citation_for_view=')
    if (positionId && positionId >= 0){
      const parts = _.split(sourceIdString, 'citation_for_view=')
      googleScholarId = parts[1]
    }
  })
  return googleScholarId
}

// "﻿title": "Scentsor: A Whole-Cell Yeast Biosensor with an Olfactory Reporter for Low-Cost and Equipment-Free Detection of Pharmaceuticals",
//     "authors": "Lieberman, Marya",
//     "doi": "https://dx.doi.org/10.1021/acssensors.0c01344",
//     "journal": "ACS Sensors",
//     "volume": "",
//     "issue": "",
//     "page": "",
//     "year": "2020",
//     "source_names": "[\"GoogleScholar\",\"PubMed\",\"Scopus\",\"WebOfScience\"]",
//     "sources": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=4cp4gcUAAAAJ&citation_for_view=4cp4gcUAAAAJ:hkOj_22Ku90C; undefined; undefined/record/display.uri?origin=resultslist&eid=2-s2.0-85094221935; https://www-webofscience-com.proxy.library.nd.edu/wos/woscc/full-record/WOS:000585974600006",
//     "abstract": "Portable and inexpensive analytical tools are required to monitor pharmaceutical quality in technology limited settings including low- and middle-income countries (LMICs). Whole cell yeast biosensors have the potential to help meet this need. However, most of the readouts for yeast biosensors require expensive equipment or reagents. To overcome this challenge, we have designed a yeast biosensor that produces a unique scent as a readout. This inducible scent biosensor, or \"scentsor\", does not require the user to administer additional reagents for reporter development and utilizes only the user's nose to be \"read\". In this Letter, we describe a scentsor that is responsive to the hormone estradiol (E2). The best estimate threshold (BET) for E2 detection with a panel of human volunteers (, = 49) is 39 nM E2 (15 nM when \"non-smellers\" are excluded). This concentration of E2 is sensitive enough to detect levels of E2 that would be found in dosage forms. This paper provides evidence that scent has the potential for use in portable yeast biosensors as a readout, particularly for use in LMICs.",
//     "citation_apa": "Barron, E., Fridmanski, E., Goodson, H., Pence, J., <b>Lieberman, M.</b>, Miller, R., Lee, S. (2020). Scentsor: A Whole-Cell Yeast Biosensor with an Olfactory Reporter for Low-Cost and Equipment-Free Detection of Pharmaceuticals. ACS Sensors.",
//     "citation_ama": "Barron, E, Fridmanski, E, Goodson, H, Pence, J, <b>Lieberman, M</b>, Miller, R, Lee, S. Scentsor: A Whole-Cell Yeast Biosensor with an Olfactory Reporter for Low-Cost and Equipment-Free Detection of Pharmaceuticals. ACS Sensors. 2020."


// returns an array
function normalizePACERecords (paceRecord) {
  const keys = _.keys(paceRecord)
  let matchedAuthors = []
  if (paceRecord['authors']) {
    matchedAuthors = _.split(paceRecord['authors'], ';')
  } else {
    matchedAuthors = _.split(paceRecord[keys[0]], ';')
  }
  let authors
  _.each(matchedAuthors, (matchedAuthor) => {
    const newAuthorString = _.trimEnd(_.trimStart(matchedAuthor))
    if (!authors) {
      authors = [newAuthorString]
    } else {
      authors.push(newAuthorString)
    }
  })
  let publicationParts = []
  if (paceRecord['citation']) {
    publicationParts = _.split(paceRecord['citation'], '). ')
  } else if (paceRecord['citation_apa']) {
    publicationParts = _.split(paceRecord['citation_apa'], '). ')
  }
  let journalVolumeCitationString = ''
  let counter = 0
  _.each(publicationParts, (part) => {
    if (counter == 1){
      journalVolumeCitationString = `${part}`
    } else if (counter > 1){
      journalVolumeCitationString = `${journalVolumeCitationString}). ${part}`
    }
    counter = counter + 1
  })
  const retrievedPosition = findCaseInsensitive(journalVolumeCitationString, 'retrieved from')
  if (retrievedPosition && retrievedPosition > 0) {
    journalVolumeCitationString = _.truncate(journalVolumeCitationString, {
      'length': retrievedPosition
    })
  }
  const authorList = _.split(publicationParts[0], ' (')[0]

  const googleScholarId = getGoogleScholarId(paceRecord['sources'])
  let rows = []
  let title = ''
  if (paceRecord['title']) {
    title = paceRecord['title']
  } else {
    title = paceRecord[keys[0]]
  }
  
  const row: NormedCSVPub = {
    authors: authors,
    title: title,
    year: _.toInteger(paceRecord['year']),
    source_names: paceRecord['source_names'],
    google_scholar_id: (googleScholarId) ? googleScholarId : '',
    doi: paceRecord['doi'],
    authorList: authorList,
    journal: paceRecord['journal'],
    journalVolumeCitationString: journalVolumeCitationString,
    overWritten: false
  }
  rows.push(row)
  return rows
}

// function getNormedAuthorListPACE(paceAuthorList) {
//   const authors = _.split(gScholarAuthorList, ',')
//   let newAuthorList = []
//   _.each(authors, (author) => {
//     const authorParts = _.split(_.trim(author), ' ')
//     const initials = authorParts[0]
//     const familyName = authorParts[1]
//     let newAuthor = `${familyName}`
//     if (initials.length > 1) {
//       newAuthor = `${newAuthor}, `
//       _.each(initials, (initial) => {
//         newAuthor = `${newAuthor}${initial}.`
//       })
//     }
//     newAuthorList.push(newAuthor)
//   })
//   let newAuthorListString = ''
//   let counter = 0
//   _.each(newAuthorList, (newAuthor) => {
//     if (counter > 0) {
//       newAuthorListString = `${newAuthorListString}, `
//     }
//     newAuthorListString = `${newAuthorListString}${newAuthor}`
//     counter = counter + 1
//   })
//   return newAuthorListString
// }

async function main () {

    const gScholarPubFile = process.env.IMSD_GOOGLE_SCHOLAR_PUB_FILE
    const pacePubFile = process.env.IMSD_PACE_PUB_FILE
    const newPacePubFile = process.env.IMSD_PACE_PUB_NEW_FILE
    const mergedPubFileDir = process.env.IMSD_MERGED_PUB_FILE_DIR

//   const crossRefDOIFilePath = process.env.CROSSREF_DOI_FILE
//   const crossRefUpdatedDOIFileDir = process.env.CROSSREF_UPDATED_DOI_FILE_DIR
//   const waitTime = process.env.CROSSREF_REQUEST_INTERVAL
  
  // load publication list
  const google_scholar_pubs = await loadCsv({
    path: gScholarPubFile,
  })

  // load publication list
  const pace_pubs = await loadCsv({
    path: pacePubFile,
  })

  // load publication list
  const new_pace_pubs = await loadCsv({
    path: newPacePubFile,
  })

  console.log(`Loaded Google Scholar Pubs: ${JSON.stringify(google_scholar_pubs, null, 2)}`)
  let normedGScholarPubs = []
  _.each(google_scholar_pubs, (gScholarPub) => {
    normedGScholarPubs.push(normalizeGoogleScholarRecord(gScholarPub))
  })
  console.log(`Normed Google Scholar Pubs: ${JSON.stringify(normedGScholarPubs, null, 2)}`)
  
  console.log(`Loaded PACE Pubs: ${JSON.stringify(pace_pubs, null, 2)}`)
  let normedPACEPubs = []
  _.each(pace_pubs, (pacePub) => {
    normedPACEPubs.push(normalizePACERecords(pacePub))
  })
  normedPACEPubs = _.flatten(normedPACEPubs)
  console.log(`Normed PACE Pubs: ${JSON.stringify(normedPACEPubs, null, 2)}`)

  console.log(`Loaded New PACE Pubs: ${JSON.stringify(new_pace_pubs, null, 2)}`)

  let normedNewPACEPubs = []
  _.each(new_pace_pubs, (pacePub) => {
    normedNewPACEPubs.push(normalizePACERecords(pacePub))
  })
  normedNewPACEPubs = _.flatten(normedNewPACEPubs)
  console.log(`Normed New PACE Pubs: ${JSON.stringify(normedNewPACEPubs, null, 2)}`)

  // merge records together, start with new pace records
  // then overwrite google scholar ones
  let oldGoogleScholarRecordsById = {}
  _.each(normedGScholarPubs, (gScholarPub) => {
    const gScholarId = gScholarPub['google_scholar_id']
    if (!oldGoogleScholarRecordsById[gScholarId]) {
      oldGoogleScholarRecordsById[gScholarId] = gScholarPub
    } else {
      let curPub = oldGoogleScholarRecordsById[gScholarId]
      if (!_.includes(curPub['authors'], gScholarPub['authors'][0])){
        curPub['authors'].push(gScholarPub['authors'][0])
        oldGoogleScholarRecordsById[gScholarId] = curPub
      }
    }
  })

  // iterate through new pace and overwrite with old gscholar record if present
  let overWrittenGScholarIds = []
  let mergedPubList = oldGoogleScholarRecordsById
  _.each(normedNewPACEPubs, (newPacePub) => {
    let mergedPub = newPacePub
    if (newPacePub['google_scholar_id'] && mergedPubList[newPacePub['google_scholar_id']]){
      //overwrite prev record
      mergedPub = mergedPubList[newPacePub['google_scholar_id']]
      let mergedAuthors = mergedPub['authors']
      _.each(newPacePub['authors'], (paceAuthor) => {
        _.each(mergedPub['authors'], (gScholarAuthor) => {
          const paceFamilyName = _.split(paceAuthor, ',')[0]
          const gScholarFamilyName = _.split(gScholarAuthor, ',')[0]
          if (_.toLower(paceFamilyName) !== _.toLower(gScholarFamilyName)){
            if (!_.includes(mergedAuthors, paceAuthor)) {
              mergedAuthors.push(paceAuthor)
            }
          }
        })
      })
      
      mergedPub['authors'] = mergedAuthors
      mergedPub['overWritten'] = true
      overWrittenGScholarIds.push(newPacePub['google_scholar_id'])
    } else {
      // use index of title instead of id not there
      if (mergedPubList[newPacePub['title']]) {
        // check if author present already
        let mergedPub = mergedPubList[newPacePub['title']]
        let mergedAuthors = mergedPub['authors']
        _.each(mergedPubList[newPacePub['title']], (mergedAuthor) => {
          _.each(newPacePub['authors'], (paceAuthor) => {
            const paceFamilyName = _.split(paceAuthor, ',')[0]
            const mergedFamilyName = _.split(mergedAuthor, ',')[0]
            if (_.toLower(paceFamilyName) !== _.toLower(mergedFamilyName)){
              if (!_.includes(mergedAuthors, paceAuthor)) {
                mergedAuthors.push(paceAuthor)
              }
            }
          })
        })
      } else {
        mergedPubList[newPacePub['title']] = newPacePub
      }
    }
  })

  console.log(`Merged Pubs: ${JSON.stringify(mergedPubList, null, 2)}`)

  // write to new csv
  let pubCSVRows = []
  _.each(_.values(mergedPubList), (pub) => {
    const authors = pub['authors']
    let authorList = pub['authorList']
    if (authorList.length > 1000){
      authorList = _.truncate(authorList, { 'length': 1000 })
      authorList = `${authorList}...`
    }
    _.each(authors, (author) => {
      let useAuthorList = authorList
      const authorPosition = findCaseInsensitive(useAuthorList, _.split(author, ',')[0])
      if (!authorPosition || authorPosition < 0){
        const authorParts = _.split(author, ',')
        useAuthorList = `${useAuthorList}, ${_.trim(authorParts[0])}, ${_.trim(authorParts[1])[0]}.`
      }
      // finally replace any undefined's that make its way into the author string
      useAuthorList = _.replace(useAuthorList, 'undefined, ', '')
      useAuthorList = _.replace(useAuthorList, ', undefined', '')      
      const citation = `${useAuthorList} (${pub['year']}). ${pub['title']}. ${pub['journalVolumeCitationString']}`
      const row: NormedCSVRow = {
        authors: author,
        title: pub['title'],
        year: _.toInteger(pub['year']),
        source_names: pub['source_names'],
        google_scholar_id: pub['google_scholar_id'],
        doi: pub['doi'],
        journal: pub['journal'],
        citation: `${citation}`,
        // journalVolumeCitationString: gScholarRecord['article_publication'],
        overWritten: pub['overWritten']
      }
      pubCSVRows.push(row)
    })
  })

  console.log(`Prepped csv rows are: ${JSON.stringify(pubCSVRows, null, 2)}`)

  // now output to new CSV file
  FsHelper.createDirIfNotExists(mergedPubFileDir, true)

  const baseFilePath = FsHelper.getFileName(newPacePubFile)
  let filePath = `${mergedPubFileDir}/`
  filePath = `${filePath}MergePubs.${moment().format('YYYYMMDDHHmmss')}.${baseFilePath}`
  console.log(`Writing data to csv: '${filePath}'...`)
  //write data out to csv
  await writeCsv({
    path: filePath,
    data: pubCSVRows
  });
  console.log(`Done writing data to csv: '${filePath}'`)

  // {
  //   "authors": "Taylor, Richard",
  //   "title": "Linear (−)‐Zampanolide: Flexibility in Conformation–Activity Relationships",
  //   "sources": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=y63FAqIAAAAJ&sortby=pubdate&citation_for_view=y63FAqIAAAAJ:eMMeJKvmdy0C",
  //   "year": "2023",
  //   "google_Scholar_id": "y63FAqIAAAAJ:eMMeJKvmdy0C",
  //   "article_authors": "CA Umaña, JL Henry, CT Saltzman, DL Sackett, LM Jenkins, RE Taylor",
  //   "article_publication": "ChemMedChem 18 (19), e202300292, 2023",
  //   "article_cited_by_value": "",
  //   "article_cited_by_link": "",
  //   "article_cited_by_cites_id": ""
  // },

  // authors
  // title
  // year
  // id
  // authorList
  // journal
  // journal volume issue page string

  // {
  //   "﻿authors": "Zorlutuna, Pinar; Smith,  Cody",
  //   "title": "Identification of astroglia-like cardiac nexus glia that are critical regulators of cardiac development and function",
  //   "doi": "https://dx.doi.org/10.1371/journal.pbio.3001444",
  //   "journal": "PLOS Biology",
  //   "year": "2021",
  //   "source_names": "[\"GoogleScholar\",\"WebOfScience\"]",
  //   "sources": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=NggImzwAAAAJ&citation_for_view=NggImzwAAAAJ:8AbLer7MMksC; undefined",
  //   "abstract": "",
  //   "citation": "Kikel-Coury, N., Brandt, J., Correia, I., O’Dea, M., DeSantis, D., Sterling, F., … Smith, C. (2021). Identification of astroglia-like cardiac nexus glia that are critical regulators of cardiac development and function. PLoS Biology. Retrieved from https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3001444"
  // }

  // authors
  // title
  // year
  // source_names
  // source_ids
  // doi
  // authorList
  // journal
  // journal volume issue page string
  // remove retrieved from


  // console.log(`CSV loaded: ${JSON.stringify(pubs, null, 2)}`)

//   // fetch csl records
//   let tempPub = _.clone(pubs[0])
//   tempPub['ISSN'] = 'XXXX'
//   let updatedPubs = []
//   updatedPubs.push(tempPub)
//   let counter = 0
//   let skippedCounter = 0
//   let errorCounter = 0
//   let foundCounter = 0

//   console.log(`Getting ISSN for '${pubs.length}' pubs`)
//   await pMap(pubs, async (pub) => {
//   // const pub = pubs[0]
//     counter += 1
//     const doi = pub['Real DOI']
//     if (doi && doi.length > 0) {
//       const csl = await getCsl(doi)
//       if (csl) {
//         const issn = csl.valueOf()['ISSN']
//         pub['ISSN'] = issn 
//         console.log(`${counter}: Found DOI: '${doi}' and ISSN: '${csl.valueOf()['ISSN']}'`)
//         foundCounter += 1
//       } else {
//         console.log(`${counter}: No ISSN for DOI: '${doi}'`)
//         errorCounter += 1
//       }
//     } else {
//       console.log(`${counter}: Skipping with no DOI set`)
//       skippedCounter += 1
//     }
//     updatedPubs.push(pub)
//     await wait(waitTime)
//   }, { concurrency: 1 })

//   console.log(`Getting ISSN Found: ${foundCounter}, Skipped: ${skippedCounter} Errors: ${errorCounter}`)

//   FsHelper.createDirIfNotExists(crossRefUpdatedDOIFileDir, true)

//   const baseFilePath = FsHelper.getFileName(crossRefDOIFilePath)
//   let filePath = `${crossRefUpdatedDOIFileDir}/`
//   filePath = `${filePath}Pubs_w_issn.${moment().format('YYYYMMDDHHmmss')}.${baseFilePath}`
//   console.log(`Writing data to csv: '${filePath}'`)
//   //write data out to csv
//   await writeCsv({
//     path: filePath,
//     data: updatedPubs
//   });
//   console.log(`CSV updated: ${JSON.stringify(updatedPubs, null, 2)}`)
//   // output csv with issn
//   // let doi = '10.14359/51738457'
//   // await getCsl(doi)
}

main()