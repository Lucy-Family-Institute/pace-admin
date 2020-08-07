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

function getDecadeDateRanges (startYear, endYear) {
  return getYearDateRanges(startYear, endYear, 10)
}

function getHalfCenturyDateRanges (startYear, endYear) {
  return getYearDateRanges(startYear, endYear, 50)
}

function getCenturyDateRanges () {
  return getYearDateRanges(1800, 2099, 100)
}

function getYearDateRanges (startYear, endYear, increment) {
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

function getMonthDateRanges(year) {
  let curMonth = 1
  const endMonth = 12
  let dates = []
  while (curMonth <= 12) {
    let curEndDate = 31
    // because the last day in the month always varies,
    // if not 12 or 1 start with first day of next month,
    // and subtract 1 to get the last day of the month
    if (curMonth > 1 && curMonth < 12) {
      curEndDate = new Date(Date.parse(`${year}-${curMonth+1}-01`) - 1).getDate()
    }
    let curMonthString = `${curMonth}`
    if (curMonth < 10) {
      curMonthString = `0${curMonthString}`
    }
    const date = {
      startYear: year,
      endYear: year,
      startDate: `${year}-${curMonthString}-01`,
      endDate: `${year}-${curMonthString}-${curEndDate}`
    }
    dates.push(date)
    curMonth += 1
  }
  return dates
}

function getSingleDateRanges(year, month, startDate, endDate) {
  let curStartDate = Number.parseInt(startDate)
  let dates = []
  let curEndDate = Number.parseInt(endDate)
  while (curStartDate <= curEndDate) {
    let curDateString = `${curStartDate}`
    if (curStartDate<10) {
      curDateString = `0${curDateString}`
    }
    const date = {
      startYear: year,
      endYear: year,
      startDate: `${year}-${month}-${curDateString}`,
      endDate: `${year}-${month}-${curDateString}`
    }
    dates.push(date)
    curStartDate += 1
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
        must: {
          query_string: {
            query: '*'
          }
        },
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
  return response.data.hits
}

// replace diacritics with alphabetic character equivalents
function removeSpaces (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    let norm =  newValue.replace(/\s/g, '')
    // console.log(`before replace space: ${value} after replace space: ${norm}`)
    return norm
  } else {
    return value
  }
}

function normalizeString (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    const norm1 = newValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // the u0027 also normalizes the curly apostrophe to the straight one
    const norm2 = norm1.replace(/[\u2019]/g, '\u0027')
    // remove periods and other remaining special characters
    const norm3 = norm2.replace(/[&\/\\#,+()$~%.'":*?<>{}!-]/g,'');
    let norm4 = norm3.replace(' and ', '')
    // replace any leading 'the' with ''
    if (_.startsWith(_.toLower(norm4), 'the ')) {
      norm4 = norm4.substr(4)
    }
    return removeSpaces(norm4)
  } else {
    return value
  }
}

async function writeSearchResult (dataDir, source, startDate, endDate, startIndex, results) {
  let dateString = 'all_dates'
  if (startDate && endDate) {
    dateString = `${startDate}_${endDate}`
  }
  let sourceString = normalizeString(source)
  const filename = path.join(dataDir, `share_metadata_${sourceString}_${dateString}_from_index_${startIndex}.json`);
  if( results && results.length > 0) {
    console.log(`Writing ${filename}`);
    await pify(fs.writeFile)(filename, JSON.stringify(results, null, 2));
  }
}

async function writeSearchResults(dataDir, source, startDate, endDate) {
  const pageSize = 1000
  const offset = 0
  let startOffset = offset
  let results = null
  if (startDate&&endDate) {
    results = await getShareSourceDateSearch(source, startDate, endDate, startOffset, pageSize)
  } else {
    // console.log('here')
    results = await getShareSourceSearch(source, startOffset, pageSize)
  }
  if (results && results.total > 0) {
    writeSearchResult(dataDir, source, startDate, endDate, startOffset, results.hits)
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
        let curOffset = (pageSize * index) + pageSize + startOffset
        if (curOffset > totalResults) {
          curOffset -= pageSize
          curOffset += totalResults - curOffset
        }
        // if (offset + pageSize < totalResults){
        //   offset = pageSize * index
        // } else {
        //   offset += totalResults - offset
        // }
        if (curOffset < totalResults) {
          // const curPage = (curOffset) / pageSize
          // curOffset = index
          try {
            const nextResults = await getShareSourceDateSearch(source, startDate, endDate, curOffset, pageSize)
            if (nextResults && nextResults.total > 0) {
              // console.log(`Offset is: ${curOffset}`)
              writeSearchResult(dataDir, source, startDate, endDate, curOffset, nextResults.hits)
            }
          } catch (error) {
            console.log(`Error on offset: ${curOffset}`)
          }
        }
      }, { concurrency: 1})
    }
  }
}

async function main() {

  // create results directory
  const dataDir = path.join(process.cwd(), dataFolderPath, `share_${moment().format('YYYYMMDDHHmmss')}`)
  fs.mkdirSync(dataDir)

  const shareSources = await getShareSources()
  const sourceTitles = _.map(shareSources, (source) => {
    return source.attributes['longTitle']
  })
  console.log(`Found ${JSON.stringify(sourceTitles, null, 2)} Share sources`)
  console.log(`Found ${sourceTitles.length} Share sources`)

  const centuryDates = getCenturyDateRanges()
  console.log(`Century dates are: ${JSON.stringify(centuryDates, null, 2)}`)

  let loopCounter = 0
  const maxLimit = 9999
  const subset = _.chunk(shareSources, 1)
  await pMap (subset[0], async (source) => {
    let sourceResults = []
    const pageSize = 1000
    const startOffset = 0
    let offset = startOffset
    //const sourceTitle = source.attributes['longTitle']
    const sourceTitle = 'NIH Research Portal Online Reporting Tools'
    randomWait(1000, loopCounter)
    const results = await getShareSourceSearch(sourceTitle, offset, pageSize)
    console.log(`${loopCounter} - Source '${sourceTitle}' found and getting ${results.total} results`)
    if (results.total > maxLimit) {
      console.log(`Too many results for source '${sourceTitle}', getting records by century...`)
      await pMap(centuryDates, async (century) => {
        // console.log(`${loopCounter} - Source '${sourceTitle}' getting ${century.startDate} to ${century.endDate}...`)
        const centuryResults = await getShareSourceDateSearch(sourceTitle, century.startDate, century.endDate, offset, pageSize)
        console.log(`${loopCounter} - Source '${sourceTitle}' found ${century.startDate} to ${century.endDate} ${centuryResults.total} results`)
        if (centuryResults.total > maxLimit) {
          console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${century.startDate} to ${century.endDate} ${centuryResults.total} results, getting by half century`)
          const halfCenturyDates = getHalfCenturyDateRanges(century.startYear, century.endYear)
          await pMap(halfCenturyDates, async (halfCentury) => {
            const halfCenturyResults = await getShareSourceDateSearch(sourceTitle, halfCentury.startDate, halfCentury.endDate, offset, pageSize)
            console.log(`${loopCounter} - Source '${sourceTitle}' found ${halfCentury.startDate} to ${halfCentury.endDate} ${halfCenturyResults.total} results`)
            if (halfCenturyResults.total > maxLimit) {
              console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${halfCentury.startDate} to ${halfCentury.endDate} ${centuryResults.total} results, getting by decade`)
              const decadeDates = getDecadeDateRanges(halfCentury.startYear, halfCentury.endYear)
              await pMap(decadeDates, async (decade) => {
                const decadeResults = await getShareSourceDateSearch(sourceTitle, decade.startDate, decade.endDate, offset, pageSize)
                console.log(`${loopCounter} - Source '${sourceTitle}' found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results`)
                if (decadeResults.total > maxLimit) {
                  console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results, getting by year`)
                  const yearDates = getYearDateRanges(decade.startYear, decade.endYear, 1)
                  await pMap(yearDates, async (year) => {
                    const yearResults = await getShareSourceDateSearch(sourceTitle, year.startDate, year.endDate, offset, pageSize)
                    console.log(`${loopCounter} - Source '${sourceTitle}' found ${year.startDate} to ${year.endDate} ${yearResults.total} results`)
                    if (yearResults.total > maxLimit) {
                      console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${year.startDate} to ${year.endDate} ${yearResults.total} results, getting by month`)
                      // do in day increments
                      const monthDates = getMonthDateRanges(year.startYear)
                      // console.log(`Month date ranges are: ${JSON.stringify(monthDates, null, 2)}`)
                      await pMap(monthDates, async (month) => {
                        const monthResults = await getShareSourceDateSearch(sourceTitle, month.startDate, month.endDate, offset, pageSize)
                        console.log(`${loopCounter} - Source '${sourceTitle}' found ${month.startDate} to ${month.endDate} ${monthResults.total} results`)
                        if (monthResults.total > maxLimit) {
                          console.log(`${loopCounter} - Source '${sourceTitle}' too many results found ${month.startDate} to ${month.endDate} ${monthResults.total} results, getting by day`)
                          // do in day increments
                          const monthStartDate = month.startDate.split('-')
                          const monthEndDate = month.endDate.split('-')
                          // console.log(`Getting single dates for ${year} ${JSON.stringify(monthStartDate, null, 2)}, ${JSON.stringify(monthEndDate, null, 2)}`)
                          const singleDates = getSingleDateRanges(monthStartDate[0], monthStartDate[1], monthStartDate[2], monthEndDate[2])
                          // console.log(`Single date ranges are: ${JSON.stringify(singleDates, null, 2)}`)
                          await pMap(singleDates, async (singleDate) => {
                            const singleDateResults = await getShareSourceDateSearch(sourceTitle, singleDate.startDate, singleDate.endDate, offset, pageSize)
                            console.log(`${loopCounter} - Source '${sourceTitle}' found ${singleDate.startDate} to ${singleDate.endDate} ${singleDateResults.total} results`)
                            if (singleDateResults.total > maxLimit) {
                              console.log(`Error: ${loopCounter} - Source '${sourceTitle}' too many results found ${singleDate.startDate} to ${singleDate.endDate} ${singleDateResults.total} results, getting by day`)  
                            } else {
                              writeSearchResults(dataDir, sourceTitle, singleDate.startDate, singleDate.endDate)    
                            }
                          }, { concurrency: 1})
                        } else {
                          writeSearchResults(dataDir, sourceTitle, month.startDate, month.endDate)    
                        }
                      }, { concurrency: 1})
                    } else {
                      writeSearchResults(dataDir, sourceTitle, year.startDate, year.endDate)    
                    }
                  }, { concurrency: 1})
                } else {
                  writeSearchResults(dataDir, sourceTitle, decade.startDate, decade.endDate)    
                }
              }, { concurrency: 1 })
            } else {
              writeSearchResults(dataDir, sourceTitle, halfCentury.startDate, halfCentury.endDate)    
            }
          }, { concurrency: 1 })
        } else {
          writeSearchResults(dataDir, sourceTitle, century.startDate, century.endDate)
        }
      }, {concurrency: 1})
    } else {
      const results = await getShareSourceSearch(sourceTitle, offset, pageSize)
      writeSearchResults(dataDir, sourceTitle, null, null)
    }
    loopCounter += 1
  }, { concurrency: 30})
  
}

main()

