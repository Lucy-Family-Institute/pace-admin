import fs from 'fs'
const Papa = require('papaparse');
import _ from 'lodash'

function parseCsv(file): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(
      file,
      {
        header: true,
        complete: (results) => {
          if (results.error) {
            reject(results.error);
          }
          resolve(results.data);
        },
      },
    );
  });
}

/**
 * 
 * @param {string} filePath Path to csv file to be loaded
 * @param {boolean} lowerCaseColumns true or false whether to convert column names to all lowercase
 * @param {hash} columnNameMap key:value pair (original:new) map of any column names to convert original column names to a new column name
 * @param includeData this defaults to true and can be set to false in order to just return an empty set of rows for total objects (can be used to optimize memory usage)
 * @param pageOffset the page index if pageSize is set, used if pageSize is provided
 * @param pageSize the max amount of results to return for each page
 * @returns array of resultant rows with column values, first row will contain column names
 */
async function loadCsv(filePath, lowerCaseColumns=false, columnNameMap={}, includeData=true, pageOffset=0, pageSize?: number) {
  // TODO error on missing filepath
  console.log(`Loading CSV File from path: ${filePath}`)
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }

  //normalize columnNameMap keys to lowercase for the matching
  const lowerColumnNameMap = _.mapKeys(columnNameMap, function (value, key){
    return key.toLowerCase()
  })

  const data = await parseCsv(fs.createReadStream(filePath));
  if (!includeData) {
    // return an array with empty values
    let emptyData = []
    _.each(data, (item, index) => {
      emptyData.push({index: index})
    })
    return emptyData
  } else {
    let curPage = data
    if (pageSize) {
      //page size is defined so will chunk results and use page offset
      const pages = _.chunk(data, pageSize)
      curPage = pages[pageOffset]
    }
    if (lowerCaseColumns || _.keys(lowerColumnNameMap).length>0) {
      return normalizeColumns(curPage, lowerCaseColumns, lowerColumnNameMap);
    } else {
      return curPage;
    }
  }
}

/**
 * 
 * @param csvData An object expected to be rows loaded from a csv file
 * @param {boolean} lowerCaseColumns true or false whether to convert column names to all lowercase
 * @param {hash} columnNameMap key:value pair (original:new) map of any column names to convert original column names to a new column name
 * 
 * @returns The object with all columns converted to lowercase and/or new column name
 */
function normalizeColumns (rows: any[], lowerCaseColumns=false, columnNameMap={}) {

  const columnNameMapSize = _.keys(columnNameMap).length
  //normalize column names to all lowercase
  return _.mapValues(rows, function (row) {
    return _.mapKeys(row, function (value, key) {
      return getTargetColumnName(key, lowerCaseColumns, columnNameMap)
    })
  })
}

function getTargetColumnName(originalName, lowerCaseColumns, columnNameMap={}) {
  // check both lowercase and non-lowercase versions
  const lowerOriginalName = originalName.toLowerCase()

  let newColumnName = originalName
  if (_.keys(columnNameMap).length>0){
    if (columnNameMap[originalName]) {
      newColumnName = columnNameMap[originalName]
    } else if (columnNameMap[lowerOriginalName]) {
      newColumnName = columnNameMap[lowerOriginalName]
    } 
  }
  return (lowerCaseColumns ? newColumnName.toLowerCase() : newColumnName)
}

interface CommandProperties {
  path: string,
  lowerCaseColumns?: boolean,
  columnNameMap?: {},
  pageOffset?: number,
  pageSize?: number,
  includeData?: boolean
}

export async function command(input: CommandProperties) {
  return loadCsv(input.path, input.lowerCaseColumns, input.columnNameMap, input.includeData, input.pageOffset, input.pageSize)
}