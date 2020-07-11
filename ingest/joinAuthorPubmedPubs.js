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

// return map of identifier type to id
function getResourceIdentifiers (resourceIdentifiers) {
  console.log(`Keying resource identifiers by type: ${JSON.stringify(resourceIdentifiers, null,2)}`)
  return _.keyBy(resourceIdentifiers, 'resourceIdentifierType')
}

async function mapAuthorFiles (filename) {
  if(!_.endsWith(filename, '.json')) return;
  const data = await pify(fs.readFile)(path.join('../data', 'pubmedByAuthor', filename));
  const author = filename.replace('.json', '');

  console.log(`Processing Author: ${author}`)

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

    const parsedName = await nameParser({
      name: `${pub.creators[0].givenName} ${pub.creators[0].familyName}`,
      reduceMethod: 'majority',
    });
    
    let doi = identifiers.doi ? identifiers.doi.resourceIdentifier : ''
    let pubmedId = identifiers.pubmed ? identifiers.pubmed.resourceIdentifier: ''
    return {
      searchName: author,
      pubTitle: title,
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
      isLastAuthor: (pub.creators.length - 1) === 1, // index
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

  console.log('Processing PubMed Author harvests load')
  console.log('Reading awards')
  const files = await pify(fs.readdir)('../data/pubmedByAuthor');

  console.log ('Mapping grant files')
  const authorsByPub = await pMap(files, mapAuthorFiles, { concurrency: 1 });

  console.log('Flattening grant files')
  const authors = _.compact(_.flatten(authorsByPub));

  const data = authors
  // console.log('Joining Pub Data')
  // const data = leftOuterJoin(authors, 'grantId', nih, 'grantId');

  console.log('Writing Author data to disk')
  await writeCsv({
    path: `../data/pubmedPubsByAuthor.${moment().format('YYYYMMDDHHmmss')}.csv`,
    data,
  });
}

go();