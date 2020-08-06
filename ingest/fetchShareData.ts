const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const pMap = require('p-map');
const schema = require('schm');
const translate = require('schm-translate');
const xmlToJson = require('xml-js');
const moment = require('moment');
import pTimes from 'p-times'

const getIds = require('./units/joinCsvs').command;

const dataFolderPath = "../data";

//const getText = constraints => prevSchema => prevSchema.merge({
//  validate(values) {
//    const parsed = prevSchema.parse(values);
//    return parsed._text;
//  }
//});

const creatorSchema = schema({
  affiliation: {type: String, default: null},
  givenName: {type: String, default: null},
  familyName: {type: String, default: null},
  initials: {type: String, default: null},
}, translate({
  affiliation: 'AffiliationInfo.Affiliation._text',
  givenName: 'ForeName._text',
  familyName: 'LastName._text',
  initials: 'Initials._text'
}));

const resourceIdentifierSchema = schema({
  resourceIdentifierType: {type: String, default: null},
  resourceIdentifier: {type: String, default: null},
}, translate({
  resourceIdentifierType: '_attributes.IdType',
  resourceIdentifier: '_text',
}));

const funderIdentifierSchema = schema({
  funder: {type: String, default: null},
  country: {type: String, default: null},
  funderIdentifier: {type: String, default: null},
}, translate ({
  funder: 'Agency._text',
  country: 'Country._text',
  funderIdentifier: 'GrantID._text',
}));

const subjectIdenfierSchema = schema({
  
});
const shareWorkSchema = schema({
  title: {type: String, default: null},
  description: {type: String, default: null},
  creators: [creatorSchema],
  resourceIdentifiers: [resourceIdentifierSchema],
  funderIdentifiers: [funderIdentifierSchema],
}, translate({
  title: 'MedlineCitation.Article.ArticleTitle._text',
  description: 'MedlineCitation.Article.Abstract.AbstractText._text',
  creators: 'MedlineCitation.Article.AuthorList.Author',
  resourceIdentifiers: 'PubmedData.ArticleIdList.ArticleId',
  funderIdentifiers: 'MedlineCitation.Article.GrantList.Grant'
}));
 
async function wait(ms){
  return new Promise((resolve, reject)=> {
    setTimeout(() => resolve(true), ms );
  });
}

async function randomWait(seedTime, index){
  const waitTime = 1000 * (index % 5)
  //console.log(`Thread Waiting for ${waitTime} ms`)
  await wait(waitTime)
}

// async function getAwardPublications(awardId){
//   const ids = await getESearch(awardId);
//   const records = await getEFetch(ids);
//   if(_.get(records, 'PubmedArticleSet.PubmedArticle', null)) {
//     return extractMetadata(records);
//   }
//   return null;
// }

// async function getESearch(term){
//   await wait(1000);
//   const url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
//   const response = await axios.get(url, {
//     params: {
//       db: 'pubmed',
//       retmode: 'json',
//       retmax: '100',
//       term,
//     }
//   });
//   return response.data.esearchresult.idlist;
// }

// async function getEFetch(ids){
//   await wait(1000);
//   const url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
//   const commaSeparatedIds = _.join(ids, ',');
//   const response = await axios.get(url, {
//     responseType: 'text',
//     params: {
//       db: 'pubmed',
//       retmode: 'xml',
//       retmax: '100',
//       id: commaSeparatedIds,
//     }
//   });
//   return xmlToJson.xml2js(response.data, {compact:true});
// }

async function getShareSources () {
  let sources = []
  let nextUrl = `https://share.osf.io/api/v2/sources/`

  while (nextUrl!==null) {
    const response = await axios.get(nextUrl, {})
    // console.log(`Response keys: ${JSON.stringify(_.keys(response.data), null, 2)}`)
    sources = _.concat(sources, response.data.data)
    // console.log(`Sources length: ${sources.length}`)
    nextUrl = response.data.links.next
  }

  return sources
}

async function getShareSourceSearch (source, curOffset, size) {
  const query = createSearchQuery(source, null, null)
  return await getShareSearch(query, curOffset, size)
}

async function getShareSourceDateSearch (source, startDate, endDate, curOffset, size) {
  const query = createSearchQuery(source, startDate, endDate)
  return await getShareSearch(query, curOffset, size)
}

// function getCenturyDates () {
//   // return [
//   //   {
//   //     startDate: '1800-01-01',
//   //     endDate: '1899-12-31'
//   //   },
//   //   {
//   //     startDate: '1900-01-01',
//   //     endDate: '1999-12-31'
//   //   },
//   //   {
//   //     startDate: '2000-01-01',
//   //     endDate: '2099-12-31'
//   //   }
//   // ]
//   return getCenturyDates
// }

function getDecadeDates (startYear, endYear) {
  return getYearDates(startYear, endYear, 10)
}

function getHalfCenturyDates (startYear, endYear) {
  return getYearDates(startYear, endYear, 50)
}

function getCenturyDates () {
  return getYearDates(1800, 2099, 100)
}

function getYearDates (startYear, endYear, increment) {
  let dates = []
  let curStartYear = startYear
  while (curStartYear <= endYear) {
    const curEndYear = curStartYear + increment - 1
    const date = {
      startYear: curStartYear,
      endYear: curEndYear,
      startDate: `${curStartYear}-01-01`,
      endDate: `${curStartYear + increment - 1}-12-31`
    }
    dates.push(date)
    curStartYear += increment
  }
  return dates
}

function createSearchQuery(source, startDate, endDate) {
  let filter = []
  filter.push({
    term: {
      sources: source
    } 
  })
  if (startDate && endDate) {
    filter.push({
      range: {
        date: {
          gte: `${startDate}||/d`,
          lte: `${endDate}||/d`
        }
      }
    })
  }
  const query = {
    query: {
      bool: {
        filter: filter
      }
    }
  }
  return query
}

async function getShareSearch (query, curOffset, size) {
  const url = `https://share.osf.io/api/v2/search/creativeworks/_search`

  // console.log(`Query is: ${JSON.stringify(query, null, 2)}`)
  const response = await axios.get(url, {
    params: {
      source: JSON.stringify(query),
      from: curOffset,
      size: size
    }
  })

  // const urlNext = response.data.links.next
  // const responseNex = await axios.get(urlNext, {
  //   params: {
  //     size: size //,
  //     // from: page
  //   }
  // })
  // console.log(`Returned response status: ${JSON.stringify(response.status, null, 2)}`)
  // console.log(`Returned responseNex statusText: ${JSON.stringify(responseNex.statusText, null, 2)}`)
  // console.log(`Returned responseNex headers: ${JSON.stringify(responseNex.headers, null, 2)}`)
  // console.log(`Returned responseNex config: ${JSON.stringify(responseNex.config, null, 2)}`)
  // console.log(`Returned responseNex data keys: ${JSON.stringify(_.keys(responseNex.data), null, 2)}`)
  // console.log(`Returned responseNex data links: ${JSON.stringify(responseNex.data.links, null, 2)}`)
  // console.log(`Returned responseNex data data keys: ${JSON.stringify(_.keys(responseNex.data.data), null, 2)}`)
  // console.log(`Returned responseNex data data keys: ${JSON.stringify(responseNex.data.data, null, 2)}`)
  return response.data.hits
}

// function extractMetadata(rawJson){
//   if (_.isArray(rawJson.PubmedArticleSet.PubmedArticle)) {
//     // console.log(`Found PubMed JSONL: ${JSON.stringify(rawJson, null, 2)}`)
//     return _.map(rawJson.PubmedArticleSet.PubmedArticle, (value,key)=> {
//       return shareWorkSchema.parse(value);
//       //return value;
//     });
//   } else {
//     // console.log(`Found PubMed JSONL: ${JSON.stringify(rawJson, null, 2)}`)
//     // return rawJson;
//     return shareWorkSchema.parse(rawJson.PubmedArticleSet.PubmedArticle);
//   }
// }

// async function getFileData(filePath){
//   //incomplete...
//   fs.readFile('/etc/passwd', (err, data) => {
//     if (err) throw err;
//     console.log(data);
//   });
// }

//async function loadAwardIdPublications(awardDataDir){
//
//  if (awardDataDir){
//    console.log(`Reading files from directory: ${awardDataDir}`);
//    fs.readdir(awardDataDir, (err, files) => {
//      if (err) throw err;
//      const mapper = async (fileName) => {
//        const filePath = path.join(awardDataDir,`${filename}`);
//        console.log(`Reading data from file: ${filePath}`);
//        awardPubs = [];
 //       const data = await getFileData(filePath);
 //       if (data){
 //         if (filename.includes('.')){
 //           awardId = filename.split('.').slice(0,-1).join('.');
 //         } else {
 //           awardId = filename;
 //         }
 //         console.log(`Creating object for award id: ${awardId}`);
 //         awardPub = createJsonObject(awardId, data);
 //         awardPubs.push(awardPub);
 //       }
 //     };
 //   }
 // } else {
 //   console.log('Reading data from Directory failed: File directory undefined');
 // }
  
  
//}

async function writeSearchResult (dataDir, startIndex, results) {
  const filename = path.join(dataDir, `share_metadata_from_${startIndex}.json`);
  if( results && results.length > 0) {
    console.log(`Writing ${filename}`);
    await pify(fs.writeFile)(filename, JSON.stringify(results, null, 2));
  }
}

async function main() {

  // create results directory
  const dataDir = path.join(process.cwd(), dataFolderPath, `share_${moment().format('YYYYMMDDHHmmss')}`)
  fs.mkdirSync(dataDir)

  const shareSources = await getShareSources()
  console.log(`Found ${shareSources.length} Share sources`)

  const centuryDates = getCenturyDates()
  console.log(`Century dates are: ${JSON.stringify(centuryDates, null, 2)}`)

  let loopCounter = 0
  const maxLimit = 9999
  const subset = _.chunk(shareSources, 1)
  await pMap (subset[4], async (source) => {
    const pageSize = 1000
    const startOffset = 0
    let offset = startOffset
    const sourceTitle = source.attributes['longTitle']
    randomWait(1000, loopCounter)
    const results = await getShareSourceSearch(source.attributes['longTitle'], offset, pageSize)
    console.log(`${loopCounter} - Source '${sourceTitle}' found and getting ${results.total} results`)
    if (results.total > maxLimit) {
      console.log(`Too many results for source '${sourceTitle}', getting records by century...`)
      await pMap(centuryDates, async (century) => {
        // console.log(`${loopCounter} - Source '${sourceTitle}' getting ${century.startDate} to ${century.endDate}...`)
        const centuryResults = await getShareSourceDateSearch(source.attributes['longTitle'], century.startDate, century.endDate, offset, pageSize)
        console.log(`${loopCounter} - Source '${sourceTitle}' found ${century.startDate} to ${century.endDate} ${centuryResults.total} results`)
        if (centuryResults.total > maxLimit) {
          console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${century.startDate} to ${century.endDate} ${centuryResults.total} results, getting by half century`)
          const halfCenturyDates = getHalfCenturyDates(century.startYear, century.endYear)
          await pMap(halfCenturyDates, async (halfCentury) => {
            const halfCenturyResults = await getShareSourceDateSearch(source.attributes['longTitle'], halfCentury.startDate, halfCentury.endDate, offset, pageSize)
            console.log(`${loopCounter} - Source '${sourceTitle}' found ${halfCentury.startDate} to ${halfCentury.endDate} ${halfCenturyResults.total} results`)
            if (halfCenturyResults.total > maxLimit) {
              console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${halfCentury.startDate} to ${halfCentury.endDate} ${centuryResults.total} results, getting by decade`)
              const decadeDates = getDecadeDates(halfCentury.startYear, halfCentury.endYear)
              await pMap(decadeDates, async (decade) => {
                const decadeResults = await getShareSourceDateSearch(source.attributes['longTitle'], decade.startDate, decade.endDate, offset, pageSize)
                console.log(`${loopCounter} - Source '${sourceTitle}' found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results`)
                if (decadeResults.total > maxLimit) {
                  console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results, getting by year`)
                  const yearDates = getYearDates(decade.startYear, decade.endYear, 1)
                  await pMap(yearDates, async (year) => {
                    const yearResults = await getShareSourceDateSearch(source.attributes['longTitle'], year.startDate, year.endDate, offset, pageSize)
                    console.log(`${loopCounter} - Source '${sourceTitle}' found ${year.startDate} to ${year.endDate} ${yearResults.total} results`)
                  }, { concurrency: 1})
                }
              }, { concurrency: 1 })
            }
          }, { concurrency: 1 })
        }
      }, {concurrency: 1})
    }
    loopCounter += 1
  }, { concurrency: 30})
  
  // if (results && results.total > 0) {
  //   writeSearchResult(dataDir, offset, results.hits)
  //   const totalResults = results.total - offset
  //   // const totalResults = 2546
  //   if (totalResults > pageSize) {
  //     let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
  //     if ((totalResults % pageSize) <= 0) {
  //       numberOfRequests -= 1
  //     }
  //     console.log(`Making ${numberOfRequests} requests for ${totalResults} results`)
  //     await pTimes (numberOfRequests, async function (index) {
  //       randomWait(1000,index)
  //       const curOffset = (pageSize * index) + pageSize + startOffset
  //       // if (curOffset > totalResults) {
  //       //   curOffset -= pageSize
  //       //   curOffset += totalResults - curOffset
  //       // }
  //       // if (offset + pageSize < totalResults){
  //       //   offset = pageSize * index
  //       // } else {
  //       //   offset += totalResults - offset
  //       // }
  //       if (curOffset < totalResults) {
  //         // const curPage = (curOffset) / pageSize
  //         // curOffset = index
  //         try {
  //           const nextResults = await getShareSearch(curOffset, pageSize)
  //           if (nextResults && nextResults.total > 0) {
  //             // console.log(`Offset is: ${curOffset}`)
  //             writeSearchResult(dataDir, curOffset, nextResults.hits)
  //           }
  //         } catch (error) {
  //           console.log(`Error on offset: ${curOffset}`)
  //         }
  //       }
  //     }, { concurrency: 1})
  //   }
  //   // writeSearchResult(dataDir, startIndex, results.hits)
  // }
}

main()

