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
  trainee?: [string],
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
  trainee?: string,
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
    title: gScholarRecord['title'],
    authors: [gScholarRecord['authors']],
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
        if (initial === initial.toUpperCase()){
          newAuthor = `${newAuthor}${initial}.`
        }
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
  // now strip off the title
  const publicationsParts2 = _.split(publicationParts[1], ".")
  let reconstructedPart1 = ''
  _.each(publicationsParts2, (part2) => {
    if (counter == 1){
      reconstructedPart1 = `${part2}`
    }
    if (counter > 1){
      reconstructedPart1 = `.${part2}`
    }
    counter = counter + 1
  })

  counter = 0
  publicationParts[1] = reconstructedPart1
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
    trainee: (paceRecord['trainee']) ? [paceRecord['trainee']] : undefined,
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

function prepPubCSVRows(mergedPubList) {
  let pubCSVRows = []

  _.each(_.values(mergedPubList), (pub) => {
    const authors = pub['authors']
    let authorList = pub['authorList']
    if (authorList.length > 1000){
      authorList = _.truncate(authorList, { 'length': 1000 })
      authorList = `${authorList}...`
    }
    _.each(authors, (author) => {
      if (pub['trainee'] && pub['trainee'].length > 0){
        _.each(pub['trainee'], (trainee) => {
          const row = prepPubCSVRow(pub, authorList, author, trainee)
          pubCSVRows.push(row)
        })
      } else {
        const row = prepPubCSVRow(pub, authorList, author, undefined)
        pubCSVRows.push(row)
      }
      // let useAuthorList = authorList
      // const authorPosition = findCaseInsensitive(useAuthorList, _.split(author, ',')[0])
      // if (!authorPosition || authorPosition < 0){
      //   const authorParts = _.split(author, ',')
      //   useAuthorList = `${useAuthorList}, ${_.trim(authorParts[0])}, ${_.trim(authorParts[1])[0]}.`
      // }

      // // finally replace any undefined's that make its way into the author string
      // useAuthorList = _.replace(useAuthorList, 'undefined, ', '')
      // useAuthorList = _.replace(useAuthorList, ', undefined', '')      
      // const citation = `${useAuthorList} (${pub['year']}). ${pub['title']}. ${pub['journalVolumeCitationString']}`
      // const row: NormedCSVRow = {
      //   authors: author,
      //   title: pub['title'],
      //   year: _.toInteger(pub['year']),
      //   source_names: pub['source_names'],
      //   google_scholar_id: pub['google_scholar_id'],
      //   doi: pub['doi'],
      //   journal: pub['journal'],
      //   citation: `${citation}`,
      //   // journalVolumeCitationString: gScholarRecord['article_publication'],
      //   overWritten: pub['overWritten']
      // }
    })
  })
  return pubCSVRows
}

function prepPubCSVRow(pub, authorList, author, trainee) {
  let useAuthorList = authorList
  const authorPosition = findCaseInsensitive(useAuthorList, _.split(author, ',')[0])
  if (!authorPosition || authorPosition < 0){
    const authorParts = _.split(author, ',')
    useAuthorList = `${useAuthorList}, ${_.trim(authorParts[0])}, ${_.trim(authorParts[1])[0]}.`
  }

  if (trainee) {
    const authorPosition = findCaseInsensitive(useAuthorList, _.split(trainee, ',')[0])
    if (!authorPosition || authorPosition < 0){
      const authorParts = _.split(trainee, ',')
      useAuthorList = `${useAuthorList}, ${_.trim(authorParts[0])}, ${_.trim(authorParts[1])[0]}.`
    }
  }
  // finally replace any undefined's that make its way into the author string
  useAuthorList = _.replace(useAuthorList, 'undefined, ', '')
  useAuthorList = _.replace(useAuthorList, ', undefined', '')      
  let citation = `${useAuthorList} (${pub['year']}).`
  const titlePosition = findCaseInsensitive(pub['journalVolumeCitationString'], pub['title'])
  if (!titlePosition || titlePosition < 0) {
    citation = `${citation}. ${pub['title']}.`
  }
  citation = `${citation}. ${pub['journalVolumeCitationString']}`
  const row: NormedCSVRow = {
    authors: author,
    title: pub['title'],
    trainee: trainee,
    year: _.toInteger(pub['year']),
    source_names: pub['source_names'],
    google_scholar_id: pub['google_scholar_id'],
    doi: pub['doi'],
    journal: pub['journal'],
    citation: `${citation}`,
    // journalVolumeCitationString: gScholarRecord['article_publication'],
    overWritten: pub['overWritten']
  }
  return row
}

function mergeNameLists(nameList1, nameList2) {
  // let mergedAuthors = mergedPub['authors']
  //   _.each(newPacePub['authors'], (newAuthor) => {
  //     let found = false
  //     _.each(mergedPub['authors'], (mergedAuthor) => {
  //       const newAuthorFamilyName = _.split(newAuthor, ',')[0]
  //       const mergedPubListFamilyName = _.split(mergedAuthor, ',')[0]
  //       if (_.toLower(newAuthorFamilyName) === _.toLower(mergedPubListFamilyName)){
  //         found = true
  //       }
  //     })
  //     if (!found && !_.includes(mergedAuthors, newAuthor)) {
  //       mergedAuthors.push(newAuthor)
  //     }
  //   })
  let newList = nameList1
  if (!nameList1 || nameList1.length <= 0){
    newList = nameList2
  } else {
    _.each(nameList2, (name2) => {
      _.each(nameList1 => (name1) => {
        const familyName2 = _.trim(_.split(name2, ',')[0])
        const familyName1 = _.trim(_.split(name1, ',')[0])
        if (_.toLower(familyName2) !== _.toLower(familyName1)){
          if (!_.includes(newList, name2)) {
            newList.push(name2)
          }
        }
      })
    })
  }
  return newList
}

function mergePubLists (sourceNormedPubs, mergeIntoNormedPubs, fullMerge=false) {
  // merge records together, start with new pace records
  // then overwrite google scholar ones
  let sourceRecordsByGoogleScholarId = {}
  let sourceRecordsByTitle = {}
  _.each(sourceNormedPubs, (sourcePub) => {
    let google_scholar_id = sourcePub['google_scholar_id']
    let title_id = _.trim(_.toLower(sourcePub['title']))
    // if (!id || _.trim(id).length <= 0) {
    //   id = _.trim(_.toLower(sourcePub['title']))
    // }
    
    if (google_scholar_id){
      if (!sourceRecordsByGoogleScholarId[google_scholar_id]) {
        sourceRecordsByGoogleScholarId[google_scholar_id] = sourcePub
      } else {
        let curPub = sourceRecordsByGoogleScholarId[google_scholar_id]
        _.each(sourcePub['authors'], (author) => {
          if (!_.includes(curPub['authors'], author)){
            curPub['authors'].push(author)
          }
        })

        // merge in trainees if present
        if (sourcePub['trainee']) {
          if (!curPub['trainee']) {
            curPub['trainee'] = []
          }
          _.each(sourcePub['trainee'], (trainee) => {
            if (!_.includes(curPub['trainee'], trainee)){
              curPub['trainee'].push(trainee)
            }
          })
        }
        sourceRecordsByGoogleScholarId[google_scholar_id] = curPub
      }
    }
    if (!sourceRecordsByTitle[title_id]) {
      sourceRecordsByTitle[title_id] = sourcePub
    } else {
      let curPub = sourceRecordsByTitle[title_id]
      _.each(sourcePub['authors'], (author) => {
        if (!_.includes(curPub['authors'], author)){
          curPub['authors'].push(author)
        }
      })

      // merge in trainees if present
      if (sourcePub['trainee']) {
        if (!curPub['trainee']) {
          curPub['trainee'] = []
        }
        _.each(sourcePub['trainee'], (trainee) => {
          if (!_.includes(curPub['trainee'], trainee)){
            curPub['trainee'].push(trainee)
          }
        })
      }
      sourceRecordsByTitle[title_id] = curPub
    }
    // } else {
    //   // use index of title instead of id not there
    //   if (sourceRecordsById[sourcePub['title']]) {
    //     // check if author present already
    //     let curPub = sourceRecordsById[sourcePub['title']]
    //     let mergedAuthors = curPub['authors']
    //     _.each(sourceRecordsById[sourcePub['title']], (mergedAuthor) => {
    //       _.each(sourcePub['authors'], (paceAuthor) => {
    //         const paceFamilyName = _.split(paceAuthor, ',')[0]
    //         const mergedFamilyName = _.split(mergedAuthor, ',')[0]
    //         if (_.toLower(paceFamilyName) !== _.toLower(mergedFamilyName)){
    //           if (!_.includes(mergedAuthors, paceAuthor)) {
    //             mergedAuthors.push(paceAuthor)
    //           }
    //         }
    //       })
    //     })
    //     mergedPub['authors'] = mergedAuthors
    //     let mergedTrainees = mergedPub['trainee']
    //     _.each(sourceRecordsById['trainee'], (paceTrainee) => {
    //       _.each(sourcePub['trainee'], (mergedTrainee) => {
    //         const paceFamilyName = _.split(paceTrainee, ',')[0]
    //         const mergedFamilyName = _.split(mergedTrainee, ',')[0]
    //         if (_.toLower(paceFamilyName) !== _.toLower(mergedFamilyName)){
    //           if (!_.includes(mergedTrainees, paceTrainee)) {
    //             mergedTrainees.push(paceTrainee)
    //           }
    //         }
    //       })
    //     })
        
    //     mergedPub['trainee'] = mergedTrainees
    //     sourceRecordsById[sourcePub['title']] = mergedPub
    //   } else {
    //     sourceRecordsById[sourcePub['title']] = sourcePub
    //   }
    // }
    //skip it if no google scholar id
  })

  // iterate through new pace and overwrite with old gscholar record if present
  let overWrittenGScholarIds = []
  let mergedPubList = {}
  if (fullMerge) mergedPubList = sourceRecordsByTitle
  _.each(mergeIntoNormedPubs, (newPacePub) => {
    let id
    let skipMerge = false
    const normedTitle = _.trim(_.toLower(newPacePub['title']))
    if (newPacePub['google_scholar_id'] && sourceRecordsByGoogleScholarId[newPacePub['google_scholar_id']]) {
      id = newPacePub['google_scholar_id']
      if (!mergedPubList[normedTitle]) {
        mergedPubList[normedTitle] = sourceRecordsByGoogleScholarId[newPacePub['google_scholar_id']]
      }
    } else if (sourceRecordsByTitle[normedTitle]) {
      id = normedTitle
      if (!mergedPubList[normedTitle]) {
        mergedPubList[normedTitle] = sourceRecordsByTitle[normedTitle]
      }
    } else {
      id = normedTitle
      if (!mergedPubList[normedTitle]) {
        mergedPubList[normedTitle] = newPacePub
        skipMerge = true
      }
    }

    // if (!skipMerge) {
    //   let mergedPub = mergedPubList[id]
    //   // const mergedAuthors = mergeNameLists(mergedPub['authors'], newPacePub['authors'])
    //   // mergedPub['authors'] = mergedAuthors
    //   if (newPacePub['trainee'] || mergedPub['trainee']) {
    //     if (!mergedPub['trainee']) mergedPub['trainee'] = []
    //     if (!newPacePub['trainee']) newPacePub['trainee'] = []
    //     const mergedTrainees = mergeNameLists(mergedPub['trainee'], newPacePub['trainee'])
    //     // mergedPub['trainee'] = mergedTrainees
    //   }
    //   mergedPubList[id] = mergedPub
    // }
    // // if (!mergedPubList[newPacePub['google_scholar_id']]) {
    // //   mergedPubList[newPacePub['google_scholar_id']] = sourceRecordsById[newPacePub['google_scholar_id']]
    // // }
    if (!skipMerge) {
      //overwrite prev record
      let mergedPub = mergedPubList[normedTitle]
      let mergedAuthors = mergedPub['authors']
      _.each(newPacePub['authors'], (newAuthor) => {
        let found = false
        _.each(mergedPub['authors'], (mergedAuthor) => {
          const newAuthorFamilyName = _.split(newAuthor, ',')[0]
          const mergedPubListFamilyName = _.split(mergedAuthor, ',')[0]
          if (_.toLower(newAuthorFamilyName) === _.toLower(mergedPubListFamilyName)){
            found = true
          }
        })
        if (!found && !_.includes(mergedAuthors, newAuthor)) {
          mergedAuthors.push(newAuthor)
        }
      })
      
      mergedPub['authors'] = mergedAuthors

      let mergedTrainees = mergedPub['trainee']
      if (!mergedTrainees) mergedTrainees = []
      _.each(newPacePub['trainee'], (newAuthor) => {
        let found = false
        _.each(mergedPub['trainee'], (mergedAuthor) => {
          const newAuthorFamilyName = _.split(newAuthor, ',')[0]
          const mergedPubListFamilyName = _.split(mergedAuthor, ',')[0]
          if (_.toLower(newAuthorFamilyName) === _.toLower(mergedPubListFamilyName)){
            found = true
          }
        })
        if (!found && !_.includes(mergedTrainees, newAuthor)) {
          mergedTrainees.push(newAuthor)
        }
      })
      
      mergedPub['trainee'] = mergedTrainees
      mergedPubList[normedTitle] = mergedPub
    }

    //   if (newPacePub['trainee']) {
    //     if (!mergedPub['trainee']) {
    //       mergedPub['trainee'] = []
    //     }
    //     let mergedTrainees = mergedPub['trainee']
    //     _.each(newPacePub['trainee'], (newAuthorTrainee) => {
    //       let found = false
    //       // if (!mergedPub['trainee']) {
    //       //   mergedPub['trainee'] = newPacePub['trainee']
    //       // }
    //       _.each(mergedPub['trainee'], (mergedTrainee) => {
    //         const newAuthorFamilyName = _.split(newAuthorTrainee, ',')[0]
    //         const mergedFamilyName = _.split(mergedTrainee, ',')[0]
    //         if (_.toLower(newAuthorFamilyName) === _.toLower(mergedFamilyName)){
    //           found = true
    //         }
    //       })
    //       if (!found && !_.includes(mergedTrainees, newAuthorTrainee)) {
    //         mergedTrainees.push(newAuthorTrainee)
    //       }
    //     })
    //     mergedPub['trainee'] = mergedTrainees
    //   }
    //   mergedPub['overWritten'] = true
    //   overWrittenGScholarIds.push(id)
    //   mergedPubList[id] = mergedPub
    // }

    // } else {
    //   // use index of title instead of id not there
    //   if (!mergedPubList[newPacePub['title']] && sourceRecordsById[newPacePub['title']]) {
    //     mergedPubList[newPacePub['title']] = sourceRecordsById[newPacePub['title']]
    //   }
    //   if (mergedPubList[newPacePub['title']]) {
    //     // check if author present already
    //     let mergedPub = mergedPubList[newPacePub['title']]
    //     let mergedAuthors = mergedPub['authors']
    //     _.each(mergedPubList[newPacePub['title']], (mergedAuthor) => {
    //       _.each(newPacePub['authors'], (paceAuthor) => {
    //         const paceFamilyName = _.split(paceAuthor, ',')[0]
    //         const mergedFamilyName = _.split(mergedAuthor, ',')[0]
    //         if (_.toLower(paceFamilyName) !== _.toLower(mergedFamilyName)){
    //           if (!_.includes(mergedAuthors, paceAuthor)) {
    //             mergedAuthors.push(paceAuthor)
    //           }
    //         }
    //       })
    //     })
    //     mergedPub['authors'] = mergedAuthors
    //     let mergedTrainees = mergedPub['trainee']
    //     _.each(newPacePub['trainee'], (paceTrainee) => {
    //       _.each(mergedPub['trainee'], (mergedTrainee) => {
    //         const paceFamilyName = _.split(paceTrainee, ',')[0]
    //         const mergedFamilyName = _.split(mergedTrainee, ',')[0]
    //         if (_.toLower(paceFamilyName) !== _.toLower(mergedFamilyName)){
    //           if (!_.includes(mergedTrainees, paceTrainee)) {
    //             mergedTrainees.push(paceTrainee)
    //           }
    //         }
    //       })
    //     })
        
    //     mergedPub['trainee'] = mergedTrainees
    //   } else {
    //     mergedPubList[newPacePub['title']] = newPacePub
    //   }
  })
  return mergedPubList
}

function mergeGoogleScholarAndPACERecords(normedGScholarPubs, normedNewPACEPubs) {
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
  return mergedPubList
}

async function main () {
  mergeFacultyPubCSV()
}

async function mergeFacultyPubCSV () {

    const gScholarPubFile = process.env.IMSD_GOOGLE_SCHOLAR_PUB_FILE
    const pacePubFile = process.env.IMSD_PACE_PUB_FILE
    const newPacePubFile = process.env.IMSD_PACE_PUB_NEW_FILE
    const mergedPubFileDir = process.env.IMSD_MERGED_PUB_FILE_DIR
    const paceStudentPubFile = process.env.IMSD_PACE_STUDENT_PUB_FILE
  
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

  // load publication list
  const student_pace_pubs = await loadCsv({
    path: paceStudentPubFile,
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

  // const mergedFacultyPubList = mergeGoogleScholarAndPACERecords(normedGScholarPubs, normedNewPACEPubs)
  const mergedFacultyPubList = mergePubLists(normedGScholarPubs, normedNewPACEPubs, true)

  console.log(`Merged Faculty Pubs: ${JSON.stringify(mergedFacultyPubList, null, 2)}`)

  // write to new csv
  const pubCSVRows = prepPubCSVRows(mergedFacultyPubList)
  // _.each(_.values(mergedPubList), (pub) => {
  //   const authors = pub['authors']
  //   let authorList = pub['authorList']
  //   if (authorList.length > 1000){
  //     authorList = _.truncate(authorList, { 'length': 1000 })
  //     authorList = `${authorList}...`
  //   }
  //   _.each(authors, (author) => {
  //     let useAuthorList = authorList
  //     const authorPosition = findCaseInsensitive(useAuthorList, _.split(author, ',')[0])
  //     if (!authorPosition || authorPosition < 0){
  //       const authorParts = _.split(author, ',')
  //       useAuthorList = `${useAuthorList}, ${_.trim(authorParts[0])}, ${_.trim(authorParts[1])[0]}.`
  //     }
  //     // finally replace any undefined's that make its way into the author string
  //     useAuthorList = _.replace(useAuthorList, 'undefined, ', '')
  //     useAuthorList = _.replace(useAuthorList, ', undefined', '')      
  //     const citation = `${useAuthorList} (${pub['year']}). ${pub['title']}. ${pub['journalVolumeCitationString']}`
  //     const row: NormedCSVRow = {
  //       authors: author,
  //       title: pub['title'],
  //       year: _.toInteger(pub['year']),
  //       source_names: pub['source_names'],
  //       google_scholar_id: pub['google_scholar_id'],
  //       doi: pub['doi'],
  //       journal: pub['journal'],
  //       citation: `${citation}`,
  //       // journalVolumeCitationString: gScholarRecord['article_publication'],
  //       overWritten: pub['overWritten']
  //     }
  //     pubCSVRows.push(row)
  //   })
  // })

  console.log(`Prepped csv rows are: ${JSON.stringify(pubCSVRows, null, 2)}`)

  console.log(`Loaded Student Pubs: ${JSON.stringify(student_pace_pubs, null, 2)}`)

  let normedStudentPACEPubs = []
  _.each(student_pace_pubs, (pacePub) => {
    normedStudentPACEPubs.push(normalizePACERecords(pacePub))
  })
  normedStudentPACEPubs = _.flatten(normedStudentPACEPubs)
  console.log(`Normed Student PACE Pubs: ${JSON.stringify(normedStudentPACEPubs, null, 2)}`)

  // merge student pubs with good pub list above and make the student subset primary
  const mergedStudentPubList = mergePubLists(mergedFacultyPubList, normedStudentPACEPubs, false)

  console.log(`Merged Student Pubs: ${JSON.stringify(mergedStudentPubList, null, 2)}`)
  let uniquePairCount = 0
  let noAuthorCount = 0
  let noTraineeCount = 0
  _.each(_.values(mergedStudentPubList), (mergedPub) => {
    const authorCount = (mergedPub['authors']) ? mergedPub['authors'].length : 0
    const traineeCount = (mergedPub['trainee']) ? mergedPub['trainee'].length : 0
    uniquePairCount = uniquePairCount + (authorCount * traineeCount)
    noAuthorCount = (!mergedPub['authors']) ? noAuthorCount + 1 : noAuthorCount
    noTraineeCount = (!mergedPub['trainee'] || mergedPub['trainee'].length == 0) ? noTraineeCount + 1 : noTraineeCount
  })
  console.log(`Merged Student Total Pubs: '${_.keys(mergedStudentPubList).length}' Unique pairs: '${uniquePairCount}' No Author Count: '${noAuthorCount}' No Trainee Count: '${noTraineeCount}'`)

  const pubCSVStudentRows = prepPubCSVRows(mergedStudentPubList)


  // // write to new csv
  // const pubStudentCSVRows = prepPubCSVRows(mergedFacultyPubList)

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

  const baseFilePath2 = FsHelper.getFileName(paceStudentPubFile)
  let filePath2 = `${mergedPubFileDir}/`
  filePath2 = `${filePath2}MergePubs.${moment().format('YYYYMMDDHHmmss')}.${baseFilePath2}`
  console.log(`Writing data to csv: '${filePath2}'...`)
  //write data out to csv
  await writeCsv({
    path: filePath2,
    data: pubCSVStudentRows
  });
  console.log(`Done writing data to csv: '${filePath2}'`)

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

}

main()