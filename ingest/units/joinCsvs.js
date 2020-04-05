const _ = require('lodash');
const pMap = require('p-map');
const Fuse = require('fuse.js');
const elasticlunr = require('elasticlunr'); // We're not using this atm

const loadCsv = require('./loadCsv').command;
const nameParser = require('./nameParser').command;

function normalizeName(name) {
  return name.toLowerCase().replace(/\W/g, ' ');
}

function nameMatchFuzzy(last, first, lastFuzzy) {
  const lastNameResults = lastFuzzy.search(last);
  console.log(`Last name match results are: ${JSON.stringify(lastNameResults, null, 2)}`)
  const fuzzyHarperFirst = new Fuse(lastNameResults, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: ['firstname'],
    findAllMatches: true,
    threshold: 0.001,
  });
  const results = fuzzyHarperFirst.search(first);
  console.log(`First name match results are: ${JSON.stringify(results, null, 2)}`)
  return results.length > 0 ? results[0] : null;
}

function nameMatchElasticLunr(last, first, index) {
  // Setup outside of this function
  // const index = elasticlunr();
  // index.addField('lastname');
  // index.addField('firstname');
  // index.setRef('netid')

  // _.forEach(harper, (value) => {
  //   index.addDoc(value);
  // });

  return index.search(`${first} ${last}`);
}

async function returnNihIds() {

  console.log('here')

  // Load names from the Harper Institute
  const harper = await loadCsv({
    path: '../data/harper.csv',
  });

  console.log('here2')
  // Build the index for lastnames (and we'll pass this in later)
  // so we only have to do it once
  const fuzzyHarperLast = new Fuse(harper, {
    caseSensitive: false,
    shouldSort: true,
    includeScore: false,
    keys: ['lastname'],
    findAllMatches: true,
    threshold: 0.001,
  });

  // Load award data
  const awards = await loadCsv({
    path: '../data/awards14-18.csv',
  });

  // For every award in the award data
  const matchedAwardsRaw = await pMap(awards, async (award, index) => {
    const leadName = award['Award Lead Investigator Name'];
    const awardName = award['Award Investigator Full Name'];

    // Parse both names
    const parsedLeadName = await nameParser({
      name: leadName,
      reduceMethod: 'majority',
    });
    const parsedAwardName = await nameParser({
      name: awardName,
      reduceMethod: 'majority',
    });

    console.log(`Looking at award ${JSON.stringify(award, null, 2)} Parsed Lead Name: ${JSON.stringify(parsedLeadName, null, 2)}`)// Fuzzy Harper: ${JSON.stringify(fuzzyHarperLast, null, 2)}`)

    // Run the fuzzy name match on the first one that matches, if a match, continue
    if(nameMatchFuzzy(parsedLeadName.last, parsedLeadName.first, fuzzyHarperLast)
      || nameMatchFuzzy(parsedLeadName.last, parsedLeadName.first, fuzzyHarperLast)) {
      
      console.log (`Found a match for ${fuzzyHarperLast}`)
      // Filter by NIH
      if(_.startsWith(award['Prime Sponsor'], 'National Institutes of Health')) {
        const awardId = award['Sponsor Award Number/ Award ID'];
        // Search for the form we know works in PMC (i.e., XY123456)--note the grouping below (parens)
        const reResult = /\w{4}([a-z]{2}[0-9]{6})-?.{2,4}.*/i.exec(awardId);
        if(reResult) {
          // Return the first group from the above regex (i.e., XY123456)
          return reResult[1];
        }
        return null;
      }
    }
    return null;
  });

  // Remove nulls (i.e., non-matches)
  const matchedAwards = _.compact(matchedAwardsRaw);
  return matchedAwards;
}

module.exports = {
  command: returnNihIds,
}