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
  const waitTime = 1000 * (index % 10)
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

async function getShareSearch (curOffset, size) {
  const url = `https://share.osf.io/api/v2/search/creativeworks/_search`
  // const url = 'https://share.osf.io/api/v2/normalizeddata/'
  const response = await axios.get(url, {
    params: {
      size: size,
      from: curOffset
    }
  })
  // console.log(`Returned response status: ${JSON.stringify(response.status, null, 2)}`)
  // console.log(`Returned response statusText: ${JSON.stringify(response.statusText, null, 2)}`)
  // console.log(`Returned response headers: ${JSON.stringify(response.headers, null, 2)}`)
  // console.log(`Returned response config: ${JSON.stringify(response.config, null, 2)}`)
  // console.log(`Returned response data keys: ${JSON.stringify(_.keys(response.data), null, 2)}`)
  // console.log(`Returned response data links: ${JSON.stringify(response.data.links, null, 2)}`)
  // console.log(`Returned response data data keys: ${JSON.stringify(_.keys(response.data.data), null, 2)}`)
  // console.log(`Returned response data data: ${JSON.stringify(response.data.data, null, 2)}`)
  // console.log(`Returned response data timed_out: ${JSON.stringify(response.data.timed_out, null, 2)}`)
  // console.log(`Returned response data _shards: ${JSON.stringify(response.data._shards, null, 2)}`)
  // console.log(`Returned response data hits keys: ${JSON.stringify(_.keys(response.data.hits), null, 2)}`)
  // console.log(`Returned response data hits total: ${JSON.stringify(response.data.hits.total, null, 2)}`)
  // console.log(`Returned response data hits max_score: ${JSON.stringify(response.data.hits.max_score, null, 2)}`)
  // // console.log(`Returned response data hits length: ${JSON.stringify(response.data.hits.hits.length, null, 2)}`)
  // // console.log(`Returned response data hits keys: ${JSON.stringify(_.keys(response.data.hits), null, 2)}`)
  // // console.log(`Returned response data hits first: ${JSON.stringify(response.data.hits.hits[0], null, 2)}`)
  // console.log(`Returned response request: ${JSON.stringify(_.keys(response.request), null, 2)}`)
  // console.log(`Returned response: ${JSON.stringify(_.keys(response), null, 2)}`)
  // console.log(`Returned response total results: ${JSON.stringify(response.data.data.length, null, 2)}`)
  // console.log(`Response keys: ${_.keys(response)}`)

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

  const pageSize = 1000
  const startOffset = 10000
  let offset = startOffset

  // create results directory
  const dataDir = path.join(process.cwd(), dataFolderPath, `share_${moment().format('YYYYMMDDHHmmss')}`)
  fs.mkdirSync(dataDir);

  const results = await getShareSearch(offset, pageSize)
  if (results && results.total > 0) {
    writeSearchResult(dataDir, offset, results.hits)
    const totalResults = results.total - offset
    // const totalResults = 2546
    if (totalResults > pageSize) {
      let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
      if ((totalResults % pageSize) <= 0) {
        numberOfRequests -= 1
      }
      console.log(`Making ${numberOfRequests} requests for ${totalResults} results`)
      await pTimes (numberOfRequests, async function (index) {
        randomWait(1000,index)
        const curOffset = (pageSize * index) + pageSize + startOffset
        // if (curOffset > totalResults) {
        //   curOffset -= pageSize
        //   curOffset += totalResults - curOffset
        // }
        // if (offset + pageSize < totalResults){
        //   offset = pageSize * index
        // } else {
        //   offset += totalResults - offset
        // }
        if (curOffset < totalResults) {
          // const curPage = (curOffset) / pageSize
          // curOffset = index
          try {
            const nextResults = await getShareSearch(curOffset, pageSize)
            if (nextResults && nextResults.total > 0) {
              // console.log(`Offset is: ${curOffset}`)
              writeSearchResult(dataDir, curOffset, nextResults.hits)
            }
          } catch (error) {
            console.log(`Error on offset: ${curOffset}`)
          }
        }
      }, { concurrency: 1})
    }
    // writeSearchResult(dataDir, startIndex, results.hits)
  }
  // const awardIds = await getIds();
  // console.log(`Award ids are: ${JSON.stringify(awardIds, null, 2)}`)
  // const uniqueAwardIds = _.uniq(awardIds);
  // //let uniqueAwardIds = ['GM067079','CA212964'];
  // console.log(`Found ${awardIds.length} awards; ${uniqueAwardIds.length} unique`);

  // const mapper = async (awardId) => {
  //   console.log(`Working on ${awardId}`);
  //   const response = await getAwardPublications(awardId);
  //   const filename = path.join(process.cwd(), dataFolderPath, 'awards', `${awardId}.json`);
  //   if( response ) {
  //     console.log(`Writing ${filename}`);
  //     await pify(fs.writeFile)(filename, JSON.stringify(response));
  //   }
  // };
  // //actually run the method above to getAwardPublications against each awardId in the awardsIds array, timeout enabled to avoid exceeded request limit to PMC
  // const result = await pMap(uniqueAwardIds, mapper, {concurrency: 2});
}

main()

