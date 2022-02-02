const _ = require('lodash');
const pify = require('pify');
const fs = require('fs');
const path = require('path');
const pMap = require('p-map');
const moment = require('moment');
const { default: readPersonPublicationsByYear } = require('./gql/readPersonPublicationsByYear');

import dotenv from 'dotenv'

const writeCsv = require('./units/writeCsv').command;
const loadCsv = require('./units/loadCsv').command;
const fuzzyMatchName = require('./units/fuzzyMatchName').command;
const nameParser = require('./units/nameParser').command;
const { default: NormedPublication } = require('./modules/normedPublication');

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
  memberFilePath: process.env.PUBMED_CENTER_MEMBER_FILE_PATH,
  awardFilePath: process.env.PUBMED_AWARD_FILE_PATH,
  dataFolderPath: process.env.PUBMED_HARVEST_DATA_DIR,
  batchSize: (process.env.HARVEST_BATCH_SIZE ? Number.parseInt(process.env.HARVEST_BATCH_SIZE) : 200)
}

// return map of identifier type to id
function getResourceIdentifiers (resourceIdentifiers) {
  console.log(`Keying resource identifiers by type: ${JSON.stringify(resourceIdentifiers, null,2)}`)
  return _.keyBy(resourceIdentifiers, 'resourceIdentifierType')
}

async function mapAuthorFiles (filename) {
  if(!_.endsWith(filename, '.json')) return;
  const data = await pify(fs.readFile)(path.join(pubmedConfig.dataFolderPath, 'pubmedByAuthor', filename));
  const author = filename.replace('.json', '');

  console.log(`Processing Author: ${author}`)

  let jsonObj = JSON.parse(data);
  if( !_.isArray(jsonObj) )
    jsonObj = [jsonObj];

  const mappedOverObject = await pMap(jsonObj, async (pub) => {
    const title = pub.title;
    // console.log(`Pubmed pub is: ${JSON.stringify(jsonObj, null, 2)}`)
    // console.log(`Before ubmed pub is: ${JSON.stringify(beforeJsonObj, null, 2)}`)

    const identifiers = getResourceIdentifiers(pub.resourceIdentifiers)
    // console.log(`Processing Pub: ${JSON.stringify(pub, null, 2)}`)
    // console.log(`Found Resource Identifiers for Title: ${title} ids: ${JSON.stringify(identifiers, null, 2)}`)
    let creators = ''
    // const mappedData = await pMap(pub.creators, async (creator, index) => {

    //   if (index > 0) {
    //     creators = `${creators};`
    //   }
    //   creators = `${creators}${creator.familyName}, ${creator.givenName}`
    // }, { concurrency: 1 });

    const parsedName = await nameParser({
      name: `${pub.creators[0].givenName} ${pub.creators[0].familyName}`,
      reduceMethod: 'majority',
    });
    
    let doi = identifiers.doi ? identifiers.doi.resourceIdentifier : ''
    let pubmedId = identifiers.pubmed ? identifiers.pubmed.resourceIdentifier: ''
    console.log(`Creating normed pub for doi: ${doi} pubmed id: ${pubmedId}`)
    // update to be part of NormedPublication
    let normedPub = {
      title: title,
      journalTitle: '',
      doi: doi,
      publicationDate: pub.publicationYear,
      datasourceName: 'PubMed',
      sourceId: pubmedId,
      sourceMetadata: pub
    }
    const objectToCSVMap = NormedPublication.loadNormedPublicationObjectToCSVMap()
    let normedPubCSV = NormedPublication.getCSVRow(normedPub, objectToCSVMap)
    // normedPubCSV = _.set(normedPubCSV, 'source_metadata', JSON.stringify(pub))
    normedPubCSV = _.set(normedPubCSV, 'first', parsedName.first)
    normedPubCSV = _.set(normedPubCSV, 'last', parsedName.last)
    normedPubCSV = _.set(normedPubCSV, 'fullName', `${parsedName.first} ${parsedName.last}`)
    normedPubCSV = _.set(normedPubCSV, 'nihAffiliation', pub.creators[0].affiliation)
    normedPubCSV = _.set(normedPubCSV, 'authorPosition', 1)
    normedPubCSV = _.set(normedPubCSV, 'isFirstAuthor', true)
    normedPubCSV = _.set(normedPubCSV, 'isLastAuthor', (pub.creators.length - 1) === 1)
    normedPubCSV = _.set(normedPubCSV, 'source_metadata', normedPub.sourceMetadata)
    return normedPubCSV
    // return mappedData;
  }, { concurrency: 1 });
  return _.flatten(mappedOverObject);
}

function leftOuterJoin(left, leftKey, right, rightKey) {
  const rightKeyed = _.keyBy(right, rightKey);
  return _.map(left, (leftObj) => {
    return _.merge(leftObj, rightKeyed[leftObj[leftKey]])
  });
}

async function go() {

  console.log('Processing PubMed Author harvests load')
  console.log('Reading awards')
  const filenamePath = path.join(process.cwd(), pubmedConfig.dataFolderPath, 'pubmedByAuthor')
  const files = await pify(fs.readdir)(filenamePath);

  console.log ('Mapping grant files')
  const authorsByPub = await pMap(files, mapAuthorFiles, { concurrency: 1 });

  console.log('Flattening grant files')
  const authors = _.compact(_.flatten(authorsByPub));

  const data = authors
  // chunk it up into sizes of 500
  const batches = _.chunk(data, pubmedConfig.batchSize)
  // console.log('Joining Pub Data')
  // const data = leftOuterJoin(authors, 'grantId', nih, 'grantId');

  console.log('Writing Author data to disk')
  const pubmedDataDir = path.join(pubmedConfig.dataFolderPath, `PubMed_${moment().format('YYYYMMDDHHmmss')}`)
  const pubmedDataDirPath = path.join(process.cwd(), pubmedDataDir)
  if (!fs.existsSync(pubmedDataDirPath)){
    fs.mkdirSync(pubmedDataDirPath);
  }

  await pMap(batches, async (batch, index) => {

    const objectToCSVMap = NormedPublication.loadNormedPublicationObjectToCSVMap()

    // write source metadata to disk
    await pMap(batch, async (pub, index) => {
      const normedPub = {
        datasourceName: 'PubMed',
        sourceId: pub.source_id,
      }
      await NormedPublication.writeSourceMetadataToJSON(normedPub, pub.source_metadata, pubmedDataDir)
    })

    // remove sourceMetadata from what is written to csv
    let csvBatch = []
    _.each(batch, (pub) => {
      csvBatch.push(_.omit(pub, 'source_metadata'))
    })

    const csvFilePath = path.join(pubmedDataDir, `pubmedPubsByAuthor.${moment().format('YYYYMMDDHHmmss')}_${index}.csv`)
    console.log(`Writing csv of pub list to: ${csvFilePath}`)
    await writeCsv({
      path: csvFilePath,
      data: csvBatch
    });
  }, {concurrency: 1})
}

go();