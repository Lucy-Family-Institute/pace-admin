const _ = require('lodash');
const pMap = require('p-map');
const Fuse = require('fuse.js');
// const elasticlunr = require('elasticlunr'); // We're not using this atm

const loadCsv = require('./loadCsv').command;
const nameParser = require('./nameParser').command;

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
  dataFolderPath: process.env.PUBMED_DATA_FOLDER_PATH
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\W/g, ' ');
}

function nameMatchFuzzy(last, first, lastFuzzy) {
  const lastNameResults = lastFuzzy.search(last);
  // console.log(`Last name match results are: ${JSON.stringify(lastNameResults, null, 2)}`)
  // need to reduce down to arrays of "item" value to then pass again to Fuse
  const reducedLastNameResults = _.map(lastNameResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  // console.log(`Reduced last name results are: ${JSON.stringify(reducedLastNameResults, null, 2)}`)
  const fuzzyFirst = new Fuse(reducedLastNameResults, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: ['given_name'],
    findAllMatches: true,
    threshold: 0.001,
  });
  const results = fuzzyFirst.search(first);
  // console.log(`First name match results are: ${JSON.stringify(results, null, 2)}`)
  return results.length > 0 ? results[0] : null;
}

function nameMatchElasticLunr(last, first, index) {
  // Setup outside of this function
  // const index = elasticlunr();
  // index.addField('lastname');
  // index.addField('firstname');
  // index.setRef('netid')

  // _.forEach(centerMembers, (value) => {
  //   index.addDoc(value);
  // });

  return index.search(`${first} ${last}`);
}

async function returnNihIds() {

  console.log(`here ${process.cwd()}`)

  // Load names from the Center/Institute
  try {
    const centerMembers = await loadCsv({
      path: pubmedConfig.memberFilePath,
    });

    console.log('here2')
    // Build the index for lastnames (and we'll pass this in later)
    // so we only have to do it once
    const fuzzyLast = new Fuse(centerMembers, {
      caseSensitive: false,
      shouldSort: true,
      includeScore: false,
      keys: ['family_name'],
      findAllMatches: true,
      threshold: 0.001,
    });

    // Load award data
    const awards = await loadCsv({
      path: pubmedConfig.awardFilePath
    });

    // For every award in the award data
    const matchedAwardsRaw = await pMap(awards, async (award, index) => {
      const leadName = award['Award Lead Investigator Name'];
      const awardName = award['Award Investigator Full Name'];

      // Parse both names
      let parsedLeadName
      if (leadName) {
        parsedLeadName = await nameParser({
          name: leadName,
          reduceMethod: 'majority',
        });
      }
      const parsedAwardName = await nameParser({
        name: awardName,
        reduceMethod: 'majority',
      });

      // console.log(`Looking at award ${JSON.stringify(award, null, 2)} Parsed Lead Name: ${JSON.stringify(parsedLeadName, null, 2)}`)// Fuzzy : ${JSON.stringify(fuzzyLast, null, 2)}`)

      // Run the fuzzy name match on the first one that matches, if a match, continue
      if (nameMatchFuzzy(parsedAwardName.last, parsedAwardName.first, fuzzyLast) ||
          (leadName && nameMatchFuzzy(parsedLeadName.last, parsedLeadName.first, fuzzyLast))){

        
        // console.log (`Found a match for ${fuzzyLast}`)
        // Filter by NIH
        if(_.startsWith(award['Prime Sponsor'], 'National Institutes of Health')) {
          // console.log('found NIH match')
          const awardId = award['Award Sponsor Award Number'];
          console.log(`Award id is: ${awardId}`)
          // Search for the form we know works in PMC (i.e., XY123456)--note the grouping below (parens)
          const reResult = /\w{4}([a-z]{2}[0-9]{6})-?.{2,4}.*/i.exec(awardId);
          if(reResult) {
            // Return the first group from the above regex (i.e., XY123456)
            // console.log(`Found award: ${reResult}`)
            return reResult[1];
          }
          return null;
        }
      }

      //console.log(`Read from centerMembers: ${JSON.stringify(centerMembers, null, 2)}`)
      return null;
    });

    // Remove nulls (i.e., non-matches)
    const matchedAwards = _.compact(matchedAwardsRaw);
    console.log(`Matched awards are: ${JSON.stringify(matchedAwards, null, 2)}`)
    return matchedAwards;
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  command: returnNihIds,
}