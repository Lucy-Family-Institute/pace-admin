const _ = require('lodash');
const pify = require('pify');
const fs = require('fs');
const path = require('path');
const pMap = require('p-map');
const moment = require('moment');

const writeCsv = require('./units/writeCsv').command;
const loadCsv = require('./units/loadCsv').command;
const fuzzyMatchName = require('./units/fuzzyMatchName').command;
const nameParser = require('./units/nameParser').command;

import dotenv from 'dotenv'

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
  dataFolderPath: process.env.PUBMED_HARVEST_DATA_DIR
}


// return map of identifier type to id
function getResourceIdentifiers (resourceIdentifiers) {
  console.log(`Keying resource identifiers by type: ${JSON.stringify(resourceIdentifiers, null,2)}`)
  return _.keyBy(resourceIdentifiers, 'resourceIdentifierType')
}

async function mapGrantFiles (filename) {
  if(!_.endsWith(filename, '.json')) return;
  const data = await pify(fs.readFile)(path.join(pubmedConfig.dataFolderPath, 'awards', filename));
  const grantId = filename.replace('.json', '');

  console.log(`Processing Grant Award Id: ${grantId}`)

  let jsonObj = JSON.parse(data);
  if( !_.isArray(jsonObj) )
    jsonObj = [jsonObj];

  const mappedOverObject = await pMap(jsonObj, async (pub) => {
    const title = pub.title;
    const identifiers = getResourceIdentifiers(pub.resourceIdentifiers)
    console.log(`Processing Pub: ${JSON.stringify(pub, null, 2)}`)
    console.log(`Found Resource Identifiers for Title: ${title} ids: ${JSON.stringify(identifiers, null, 2)}`)
    let creators = ''
    const mappedData = await pMap(pub.creators, async (creator, index) => {

      if (index > 0) {
        creators = `${creators};`
      }
      creators = `${creators}${creator.familyName}, ${creator.givenName}`
    }, { concurrency: 1 });

    const centerMembers = await loadCsv({
      path: pubmedConfig.memberFilePath
    });

    const parsedName = await nameParser({
      name: `${pub.creators[0].givenName} ${pub.creators[0].familyName}`,
      reduceMethod: 'majority',
    });

    const isCenterMembersResult = fuzzyMatchName({
      first: parsedName.first,
      last: parsedName.last,
      corpus: centerMembers,
      keyFirst: 'given_name',
      keyLast: 'family_name',
    });

    const awards = await loadCsv({
      path: pubmedConfig.awardFilePath
    });

    const investigatorCorpus = await pMap(awards, async (award) => {
      const name = award['Award Investigator Full Name'];
      const nameObj = await nameParser({
        name,
        reduceMethod: 'majority',
      });
      return nameObj;
    }, {concurrency: 1});

    const isAwardInvestigatorResult = fuzzyMatchName({
      first: parsedName.first,
      last: parsedName.last,
      corpus: investigatorCorpus,
      keyFirst: 'first',
      keyLast: 'last',
    });
    
    const leadCorpus = await pMap(awards, async (award) => {
      const name = award['Award Lead Investigator Name'];
      const nameObj = await nameParser({
        name,
        reduceMethod: 'majority',
      });
      return nameObj;
    }, {concurrency: 1});

    const isLeadInvestigatorResult = fuzzyMatchName({
      first: parsedName.first,
      last: parsedName.last,
      corpus: leadCorpus,
      keyFirst: 'first',
      keyLast: 'last',
    },  {concurrency: 1});
    
    let doi = identifiers.doi ? identifiers.doi.resourceIdentifier : ''
    let pubmedId = identifiers.pubmed ? identifiers.pubmed.resourceIdentifier: ''
    return {
      pubTitle: title,
      grantId: grantId,
      nihGivenName: pub.creators[0].givenName,
      nihFamilyName: pub.creators[0].familyName,
      doi: doi,
      pubmed_id: pubmedId,
      pubmed_record: JSON.stringify(pub),
      first: parsedName.first,
      last: parsedName.last,
      fullName: `${parsedName.first} ${parsedName.last}`,
      nihAffiliation: pub.creators[0].affiliation,
      authorPosition: 1, // index + 1,
      isFirstAuthor: true, //index === 0,
      isLastAuthor: (pub.creators.length - 1) === 1, // index,
      isCenterMember: isCenterMembersResult !== null,
      isInvestigator: isAwardInvestigatorResult !== null,
      isLeadInvestigator: isLeadInvestigatorResult !== null,
    };
    return mappedData;
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

  console.log('Processing NIH load')
  const awards = await loadCsv({
    path: pubmedConfig.awardFilePath,
  });
  
  const nih = _.compact(_.map(awards, (award) => {
    if(!_.startsWith(award['Prime Sponsor'], 'National Institutes of Health')) {
      return null;
    }
    const awardId = award['Sponsor Award Number/ Award ID'];
    const reResult = /\w{4}([a-z]{2}[0-9]{6})-?.{2,4}.*/i.exec(awardId);
    if(!reResult) return null;
    award.grantId = reResult[1];
    return award;
  }));
  
  console.log('Reading awards')
  const awardPath = path.join(pubmedConfig.dataFolderPath, 'awards');
  const files = await pify(fs.readdir)(awardPath);

  console.log ('Mapping grant files')
  const authorsByGrant = await pMap(files, mapGrantFiles, { concurrency: 1 });

  console.log('Flattening grant files')
  const authors = _.compact(_.flatten(authorsByGrant));

  console.log('Joining Grant Award Data')
  const data = leftOuterJoin(authors, 'grantId', nih, 'grantId');

  console.log('Writing Grant Award data to disk')
  const authorsByAwardsPath = path.join(process.cwd(), pubmedConfig.dataFolderPath, `authorsByAwards.${moment().format('YYYYMMDDHHmmss')}.csv`);
  await writeCsv({
    path: authorsByAwardsPath,
    data,
  });
}

go();