const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const pMap = require('p-map');
const schema = require('schm');
const translate = require('schm-translate');
const xmlToJson = require('xml-js');
import { wait } from "./units/randomWait"
import dotenv from 'dotenv'

const getIds = require('./units/joinCsvs').command;

dotenv.config({
  path: '../.env'
})

// environment variables
process.env.NODE_ENV = 'development';

const pubmedConfig = {
  baseUrl: process.env.PUBMED_BASE_URL,
  queryUrl: process.env.PUBMED_QUERY_URL,
  sourceName: process.env.PUBMED_SOURCE_NAME,
  publicationUrl: process.env.PUBMED_PUBLICATION_URL,
  pageSize: process.env.PUBMED_PAGE_SIZE,
  requestInterval: Number.parseInt(process.env.PUBMED_REQUEST_INTERVAL),
  dataFolderPath: process.env.PUBMED_HARVEST_DATA_DIR
}

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
  publicationYear: {type: String, default: null},
  description: {type: String, default: null},
  creators: [creatorSchema],
  resourceIdentifiers: [resourceIdentifierSchema],
  funderIdentifiers: [funderIdentifierSchema],
}, translate({
  title: 'MedlineCitation.Article.ArticleTitle._text',
  publicationYear: 'MedlineCitation.Article.Journal.JournalIssue.PubDate.Year._text',
  description: 'MedlineCitation.Article.Abstract.AbstractText._text',
  creators: 'MedlineCitation.Article.AuthorList.Author',
  resourceIdentifiers: 'PubmedData.ArticleIdList.ArticleId',
  funderIdentifiers: 'MedlineCitation.Article.GrantList.Grant'
}));

async function getAwardPublications(awardId){
  const ids = await getESearch(awardId);
  const records = await getEFetch(ids);
  if(_.get(records, 'PubmedArticleSet.PubmedArticle', null)) {
    return extractMetadata(records);
  }
  return null;
}

async function getESearch(term){
  await wait(pubmedConfig.requestInterval);
  const url = pubmedConfig.queryUrl
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
  await wait(pubmedConfig.requestInterval);
  const url = pubmedConfig.publicationUrl
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

async function go() {
  const awardIds = await getIds();
  console.log(`Award ids are: ${JSON.stringify(awardIds, null, 2)}`)
  const uniqueAwardIds = _.uniq(awardIds);
  //let uniqueAwardIds = ['GM067079','CA212964'];
  console.log(`Found ${awardIds.length} awards; ${uniqueAwardIds.length} unique`);

  const mapper = async (awardId) => {
    console.log(`Working on ${awardId}`);
    const response = await getAwardPublications(awardId);

    const awardsPath = path.join(process.cwd(), pubmedConfig.dataFolderPath, 'awards')
    if (!fs.existsSync(awardsPath)){
      fs.mkdirSync(awardsPath, { recursive: true });
    }
    const filename = path.join(awardsPath, `${awardId}.json`);
    if( response ) {
      console.log(`Writing ${filename}`);
      await pify(fs.writeFile)(filename, JSON.stringify(response));
    }
  };
  //actually run the method above to getAwardPublications against each awardId in the awardsIds array, timeout enabled to avoid exceeded request limit to PMC
  const result = await pMap(uniqueAwardIds, mapper, {concurrency: 2});
}

go();
