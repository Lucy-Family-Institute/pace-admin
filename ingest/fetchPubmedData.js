const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const pMap = require('p-map');
const schema = require('schm');
const translate = require('schm-translate');
const xmlToJson = require('xml-js');

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

// const subjectIdenfierSchema = schema({
  
// });
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

async function getAwardPublications(awardId){
  const ids = await getESearch(awardId);
  const records = await getEFetch(ids);
  if(_.get(records, 'PubmedArticleSet.PubmedArticle', null)) {
    return extractMetadata(records);
  }
  return null;
}

async function getESearch(term){
  await wait(1000);
  const url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  const response = await axios.get(url, {
    params: {
      db: 'pubmed',
      retmode: 'json',
      retmax: '100',
      term,
    }
  });
  return response.data.esearchresult.idlist;
}

async function getEFetch(ids){
  await wait(1000);
  const url = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
  const commaSeparatedIds = _.join(ids, ',');
  const response = await axios.get(url, {
    responseType: 'text',
    params: {
      db: 'pubmed',
      retmode: 'xml',
      retmax: '100',
      id: commaSeparatedIds,
    }
  });
  return xmlToJson.xml2js(response.data, {compact:true});
}

function extractMetadata(rawJson){
  if (_.isArray(rawJson.PubmedArticleSet.PubmedArticle)) {
    // console.log(`Found PubMed JSONL: ${JSON.stringify(rawJson, null, 2)}`)
    return _.map(rawJson.PubmedArticleSet.PubmedArticle, (value,key)=> {
      return shareWorkSchema.parse(value);
      //return value;
    });
  } else {
    // console.log(`Found PubMed JSONL: ${JSON.stringify(rawJson, null, 2)}`)
    // return rawJson;
    return shareWorkSchema.parse(rawJson.PubmedArticleSet.PubmedArticle);
  }
}

async function getFileData(filePath){
  //incomplete...
  fs.readFile('/etc/passwd', (err, data) => {
    if (err) throw err;
    console.log(data);
  });
}

async function createAwardPubJSON(awardId, data){

}

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

async function go() {
  const awardIds = await getIds();
  console.log(`Award ids are: ${JSON.stringify(awardIds, null, 2)}`)
  const uniqueAwardIds = _.uniq(awardIds);
  //let uniqueAwardIds = ['GM067079','CA212964'];
  console.log(`Found ${awardIds.length} awards; ${uniqueAwardIds.length} unique`);

  const mapper = async (awardId) => {
    console.log(`Working on ${awardId}`);
    const response = await getAwardPublications(awardId);
    const filename = path.join(process.cwd(), dataFolderPath, 'awards', `${awardId}.json`);
    if( response ) {
      console.log(`Writing ${filename}`);
      await pify(fs.writeFile)(filename, JSON.stringify(response));
    }
  };
  //actually run the method above to getAwardPublications against each awardId in the awardsIds array, timeout enabled to avoid exceeded request limit to PMC
  const result = await pMap(uniqueAwardIds, mapper, {concurrency: 2});
}

go();

