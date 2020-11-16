import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pEachSeries from 'p-each-series'
import insertJournalsImpactFactors from './gql/insertJournalsImpactFactors'
import readJournals from './gql/readJournals'
import readJournalsImpactFactors from './gql/readJournalsImpactFactors'
import { command as loadCsv } from './units/loadCsv'
import { responsePathAsArray } from 'graphql'
import Cite from 'citation-js'
import pMap from 'p-map'
import { command as nameParser } from './units/nameParser'
import humanparser from 'humanparser'
import dotenv from 'dotenv'
import { split } from 'apollo-link'
const Fuse = require('fuse.js')
const moment = require('moment')
const pify = require('pify')
const fs = require('fs')
const writeCsv = require('./units/writeCsv').command;
import { randomWait } from './units/randomWait'
import { removeSpaces, normalizeString, normalizeObjectProperties } from './units/normalizer'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

function createFuzzyIndex (titleKey, journalMap) {
  // first normalize the diacritics
  const testJournalMap = _.map(journalMap, (journal) => {
    return normalizeObjectProperties(journal, [titleKey], { normalizeTitle: true, skipLower: true })
 })

 const journalFuzzy = new Fuse(testJournalMap, {
   caseSensitive: false,
   shouldSort: true,
   includeScore: false,
   keys: [titleKey],
   findAllMatches: false,
   threshold: 0.001,
 });

 return journalFuzzy
}

function journalMatchFuzzy (journalTitle, fuzzyIndex){
  // normalize last name checking against as well
  const testTitle = normalizeString(journalTitle, { normalizeTitle: true, skipLower: true })
  const journalResults = fuzzyIndex.search(testTitle)
  const reducedResults = _.map(journalResults, (result) => {
    return result['item'] ? result['item'] : result
  })
  // console.log(`For testing: ${testLast} Last name results: ${JSON.stringify(lastNameResults, null, 2)}`)
  return reducedResults
}

async function getSimplifiedJournalFactors (journalFactors, year) {
  return _.map(journalFactors, (journalFactor) => {
    return {
      title: journalFactor['journal_title'],
      impact_factor: journalFactor['journal_impact_factor'],
      year: year
    }
  })
}

async function getJournalsByTitle (journals) {
  let journalsByTitle = {}
  _.each(journals, (journal) => {
    journalsByTitle[journal['title']] = journal
  })
  return journalsByTitle
}

async function insertJournalImpactFactorsToDB (journalImpactFactors) {
  try {
    const mutateFactorResult = await client.mutate(
      insertJournalsImpactFactors (journalImpactFactors)
    )
    // console.log(`mutate result keys are: ${_.keys(mutateFactorResult.data)}`)
    return mutateFactorResult.data.insert_journals_impactfactors.returning
  } catch (error) {
    throw error
  }
}

async function loadJournals () {
  const queryResult = await client.query(readJournals())
  return queryResult.data.journals
}

async function loadJournalsImpactFactors () {
  const queryResult = await client.query(readJournalsImpactFactors())
  return queryResult.data.journals_impactfactors
}

function createImpactFactorObject(title, year, factor, journal_id) {
  return {
    title: title,
    year: year,
    impactfactor: factor,
    journal_id: journal_id
  }
}

function getSimpleMatch (matchedInfo) {
  let obj = {
    journal_if_title: matchedInfo['title'],
    matched_journal_id: matchedInfo['Matches'][0]['id'],
    matched_journal_title: matchedInfo['Matches'][0]['title']
  }
  return obj
}

async function loadJournalsImpactFactorsFromCSV (csvPathsByYear, journalMap, currentJournalImpactFactorsByJournalId) {
  try {
    let simplifiedJournalFactors = []
    await pMap (_.keys(csvPathsByYear), async (year) => {
      await pMap (csvPathsByYear[year], async (path) => {
        console.log(`Loading Journals Impact Factors for year ${year} from path: ${path}`)
        const journalsImpactFactors: any = await loadCsv({
          path: path
        })

        //normalize column names to all lowercase
        const lowerJournalsImpactFactors = _.map(journalsImpactFactors, function (row) {
          const lowerRow =  _.mapKeys(row, function (value, key) {
            return key.toLowerCase()
          })
          return lowerRow
        })

        simplifiedJournalFactors = _.concat(simplifiedJournalFactors, await getSimplifiedJournalFactors(lowerJournalsImpactFactors, year))
      }, { concurrency: 1 })
    }, { concurrency: 1})

    const journalFactorsByTitle = _.groupBy(simplifiedJournalFactors, (journalFactor) => {
      return _.toLower(journalFactor['title'])
    })
    // console.log(`Loaded Simplified Journal Factors Journals: ${JSON.stringify(journalFactorsByTitle, null, 2)}`)

    // now group sub items by year and remove duplicates that may exist for each year (i.e., protect against bad data)
    let journalFactorsByYearByTitle = {}
    _.each(_.keys(journalFactorsByTitle), (title) => {
      journalFactorsByYearByTitle[title] = _.groupBy(journalFactorsByTitle[title], (journalFactor) => {
        return journalFactor['year']
      })
      // reduce to single item per year
      _.each(_.keys(journalFactorsByYearByTitle[title]), (year) => {
        journalFactorsByYearByTitle[title][year] = _.chunk(journalFactorsByYearByTitle[title][year], 1)[0][0]
      })
    })
    // console.log(`Loaded Simplified Journal Factors Journals: ${JSON.stringify(journalFactorsByYearByTitle[_.keys(journalFactorsByYearByTitle)[0]], null, 2)}`)
    console.log(`Loaded factors for ${_.keys(journalFactorsByYearByTitle).length} total journals`)
    const journalFuzzyIndex = createFuzzyIndex('title', journalMap)
    const multipleMatches = []
    const zeroMatches = []
    const singleMatches = []

    // const subset = _.dropRight(simplifiedJournalFactors, 10700)
    const testJournalFactorTitles = _.keys(journalFactorsByYearByTitle)
    // const subset = _.dropRight(testJournalFactorTitles, 12340)

    let factorCounter = 0
    await pMap(testJournalFactorTitles, async (journalFactorTitle) => {
      factorCounter += 1
      console.log(`${factorCounter} - Checking match for journal factor: ${journalFactorTitle}`)
      let matchedJournal = undefined
      const testTitle = normalizeString(journalFactorTitle, { normalizeTitle: true, skipLower: true })
      // console.log(`checking test title: ${testTitle}`)
      // console.log(`Journal Map is: ${JSON.stringify(journalMap, null, 2)}`)
      const matchedJournals = journalMatchFuzzy(testTitle, journalFuzzyIndex)
      // console.log(`matched journals are: ${JSON.stringify(matchedJournals, null, 2)}`)

      let otherMatchedJournals = []
      let otherMatchString = ''
      // check with prefix stripped off as well if there is one
      const splitJournalTitle = journalFactorTitle.split('-')
      // only test again if only one word before the hyphen
      if (splitJournalTitle.length>1 && splitJournalTitle[0].indexOf(' ') < 0){
        // check to see if has prefix to strip
        otherMatchString = journalFactorTitle.substr(journalFactorTitle.indexOf('-')+1)
        otherMatchString = normalizeString(otherMatchString, { normalizeTitle: true, skipLower: true })
        // console.log(`Checking new match string ${otherMatchString}`)
        otherMatchedJournals = journalMatchFuzzy(otherMatchString, journalFuzzyIndex)
      }
      let matchedInfo = {
        'title': journalFactorTitle
        // 'year': journalFactor['year'],
        // 'factor': journalFactor['impact_factor']
      }
      if (matchedJournals.length > 1 || otherMatchedJournals.length > 1) {
        // console.log('here')
        let extraMatch = []
        _.each(matchedJournals, (matched) => {
          // console.log(`Checking multiple matched journal test title ${testTitle}: ${JSON.stringify(matched, null, 2)}`)
          // try to grab exact match if it exists
          if (_.toLower(matched['title']) === _.toLower(testTitle)) {
            // console.log(`Found exact match for multiple matched journal: ${JSON.stringify(matched, null, 2)}`)
            matchedInfo['Matches'] = [matched]
          }
        })
        _.each(otherMatchedJournals, (otherMatched) => {
          if (_.toLower(otherMatched['title']) === _.toLower(otherMatchString)) {
            // console.log(`Found exact match for multiple matched journal: ${JSON.stringify(matched, null, 2)}`)
            extraMatch.push(otherMatched)
          }
        })

        if (matchedInfo['Matches'] && matchedInfo['Matches'].length === 1) {
          singleMatches.push(matchedInfo)
        } else if (extraMatch.length === 1) {
          matchedInfo['Matches'] = extraMatch
          singleMatches.push(matchedInfo)
        } else if (matchedJournals.length > 1){
          matchedInfo['Matches'] = matchedJournals
          multipleMatches.push(matchedInfo)
        } else if (otherMatchedJournals.length > 1){
          matchedInfo['Matches'] = otherMatchedJournals
          multipleMatches.push(matchedInfo)
        }
      } else if (matchedJournals.length <= 0 && otherMatchedJournals.length <= 0) {
        zeroMatches.push(matchedInfo)
        // zeroMatches.push(`No Matched journals for publication title - ${publication['title']}, journal - ${testTitle}: ${JSON.stringify(matchedJournals, null, 2)}`)
      } else if (matchedJournals.length === 1 || otherMatchedJournals.length === 1){
        if (matchedJournals.length === 1 && _.toLower(matchedJournals[0]['title']) === _.toLower(testTitle)) {
          matchedInfo['Matches'] = matchedJournals
          singleMatches.push(matchedInfo)
        } else if (otherMatchedJournals.length === 1 && _.toLower(otherMatchedJournals[0]['title']) === _.toLower(otherMatchString)) {
          matchedInfo['Matches'] = otherMatchedJournals
          singleMatches.push(matchedInfo)
        }
        else {
          zeroMatches.push(matchedInfo)
        }
        // console.log(`Matched journal - ${testTitle}: ${JSON.stringify(matchedJournals, null, 2)}`)
      }
    }, {concurrency: 60})

    // console.log(`Multiple Matches: ${JSON.stringify(multipleMatches, null, 2)}`)
    // _.each(zeroMatches, (zeroMatch) => {
    //    console.log(`No Match Title: ${zeroMatch['title']}`)
    // })
    // console.log(`Single Matches: ${JSON.stringify(singleMatches, null, 2)}`)
    console.log(`No Matches Count: ${zeroMatches.length}`)
    console.log(`Multiple Matches Count: ${multipleMatches.length}`)
    console.log(`Single Matches Count: ${singleMatches.length}`)

    // write no match, multiple match, single match to files
    const dataFolderPath = '../data'
    const singleFilename = `${dataFolderPath}/journal_impact_factor_single_match.${moment().format('YYYYMMDDHHmmss')}.json`
    const multipleFilename = `${dataFolderPath}/journal_impact_factor_multiple_matches.${moment().format('YYYYMMDDHHmmss')}.json`
    const zeroFilename = `${dataFolderPath}/journal_impact_factor_no_matches.${moment().format('YYYYMMDDHHmmss')}.json`
    console.log(`Writing ${singleFilename}`);
    await pify(fs.writeFile)(singleFilename, JSON.stringify(singleMatches))
    console.log(`Writing ${multipleFilename}`);
    await pify(fs.writeFile)(multipleFilename, JSON.stringify(multipleMatches))
    console.log(`Writing ${zeroFilename}`);
    await pify(fs.writeFile)(zeroFilename, JSON.stringify(zeroMatches))

    //write out single matches as csv
    const singleCSVFileName = `${dataFolderPath}/journal_impact_factor_single_match.${moment().format('YYYYMMDDHHmmss')}.csv`
    const data = _.map(singleMatches, (match) => {
      return getSimpleMatch(match)
    })
    console.log(`data is: ${JSON.stringify(data, null, 2)}`)
    await writeCsv({
      path: singleCSVFileName,
      data
    });


    // get current ones in DB and only insert if not already there
    // load the journal map into a map of id to year to existing impact factors
    // console.log(`Doing test prev impact factors by id: ${JSON.stringify(currentJournalImpactFactorsByJournalId, null , 2)}`)
    let currentImpactFactorsByYearByJournalId = {}
    _.each(_.keys(currentJournalImpactFactorsByJournalId), (journal_id) => {
      currentImpactFactorsByYearByJournalId[journal_id] = {}
      _.each (currentJournalImpactFactorsByJournalId[journal_id], (impactFactor) => {
        currentImpactFactorsByYearByJournalId[journal_id][impactFactor['year']] = impactFactor
      })
    })

    // console.log(`Current Journal Impact Factors are: ${JSON.stringify(currentImpactFactorsByYearByJournalId, null, 2)}`)

    // prep the single matches insert array
    let journalImpactFactorsForInsert = []
    let skipInsertCount = 0
    _.each(singleMatches, (impactFactorMatch) => {
      const impactFactorTitle = impactFactorMatch['title']
      // console.log(`Impact factor title is: ${impactFactorTitle}`)
      const matchedJournals = impactFactorMatch['Matches']
      // console.log(`Matches found are: ${JSON.stringify(matchedJournals, null, 2)}`)
      // console.log(`Journal Factors By Year are: ${JSON.stringify(journalFactorsByYearByTitle[impactFactorTitle], null, 2)}`)
      if (journalFactorsByYearByTitle[impactFactorTitle]) {
        _.each(matchedJournals, (journal) => {
          _.each(_.keys(journalFactorsByYearByTitle[impactFactorTitle]), (year) => {
            if (!currentImpactFactorsByYearByJournalId[journal['id']] ||
              !currentImpactFactorsByYearByJournalId[journal['id']][year]){
              let obj = journalFactorsByYearByTitle[impactFactorTitle][year]
              journalImpactFactorsForInsert.push(createImpactFactorObject(obj['title'], obj['year'], obj['impact_factor'], journal['id']))
            } else {
              skipInsertCount += 1
            }
          })
        })
      }
    })
    // console.log(`Journal Impact Factors prepped for insert are: ${JSON.stringify(journalImpactFactorsForInsert, null, 2)}`)

    if (skipInsertCount > 0) {
      console.log(`Skipping insert of ${skipInsertCount} existing impact factor objects`)
    }

    // insert new factor objects
    // insert each year factor for each journal matched with matched id and original journal impact factor name
    let loopCounter = 0
    // insert in batches
    const batchSize = 1000
    const batches = _.chunk(journalImpactFactorsForInsert, batchSize)
    await pMap(batches, async (journalImpactFactors) => {
      //insert batch
      loopCounter += 1
      console.log(`Trying to insert ${journalImpactFactors.length} journal impact factors for loop ${loopCounter}`)
      //prepare batch

      //have each wait a pseudo-random amount of time between 1-5 seconds
      await randomWait(loopCounter)
      const insertedJournalImpactFactors = await insertJournalImpactFactorsToDB(journalImpactFactors)
      console.log(`Inserted ${insertedJournalImpactFactors.length} Journal Impact Factors`)
    }, {concurrency: 1})

    // return journals
  } catch (error){
    throw error
  }
}

//returns status map of what was done
async function main() {

  const pathsByYear = {
    2019: ['../data/JournalsImpactFactor_2019.csv'],
    2018: ['../data/JournalsImpactFactor_2018.csv'],
    2017: ['../data/JournalsImpactFactor_2017.csv']
  }
  console.log(`Starting query journals ${moment().format('HH:mm:ss')}...`)
  const journals = await loadJournals()
  console.log(`Finished query journals ${moment().format('HH:mm:ss')}`)

  console.log(`Starting query existing journal impact factors ${moment().format('HH:mm:ss')}...`)
  const currentJournalImpactFactors = await loadJournalsImpactFactors()
  // console.log(`Loaded current impact factor objects: ${JSON.stringify(currentJournalImpactFactors, null, 2)}`)
  const currentJournalImpactFactorsByJournalId = _.groupBy(await loadJournalsImpactFactors(), (factor) => {
    return factor.journal_id
  })
  console.log(`Finished query existing journal impact factors ${moment().format('HH:mm:ss')}`)
  // first normalize the diacritics
  console.log(`Starting normalize journal properties ${moment().format('HH:mm:ss')}...`)
  let journalMap = _.map(journals, (journal) => {
    return normalizeObjectProperties(journal, ['title'], { normalizeTitle: true, skipLower: true })
  })
  console.log(`Finished normalize journal properties ${moment().format('HH:mm:ss')}`)
  // journalMap = _.filter(journalMap, (journal) => {
  //   return journal.id === 207053
  // })
  // console.log(`Journal map is: ${JSON.stringify(journalMap, null, 2)}`)
  const journalStatus = await loadJournalsImpactFactorsFromCSV(pathsByYear, journalMap, currentJournalImpactFactorsByJournalId)
}

main()
