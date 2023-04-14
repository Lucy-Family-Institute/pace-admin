import _ from 'lodash'
import NormedAuthor from './normedAuthor'
import DataSource from './dataSource'
import { PubMedDataSource } from './pubmedDataSource'
import { SemanticScholarDataSource } from './semanticScholarDataSource'
import DataSourceConfig from './dataSourceConfig'
import { ScopusDataSource } from './scopusDataSource'
import { CrossRefDataSource } from './crossrefDataSource'
import { WosDataSource } from './wosDataSource'
import { GoogleScholarDataSource } from './googleScholarDataSource'

// given a datasource name returns the correct datasource object
// put this code in one class to avoid hard-coded the datasource name variants everywhere
export default class DataSourceHelper {
  public static checkDataSourceConfig(ds: DataSource) {
    if (!ds.getDataSourceConfig()) {
      throw ('DataSourceConfig not defined for datasource.  It must be defined for this operation')
    }
  }

  // pass in dsConfig if need to do any fetching of data from the datasource
  public static getDataSource(dataSourceName, dsConfig?: DataSourceConfig): DataSource {
    // can add new variants to this as needed in the future if multiple versions of data source name may exist
    if (dataSourceName) {
      const lowerDSName = _.toLower(dataSourceName)
      if (lowerDSName === 'pubmed') {
        return new PubMedDataSource(dsConfig)
      } else if (lowerDSName === 'semanticscholar') {
        return new SemanticScholarDataSource(dsConfig)
      } else if (lowerDSName === 'scopus') {
        return new ScopusDataSource(dsConfig)
      } else if (lowerDSName === 'crossref') {
        return new CrossRefDataSource(dsConfig)
      } else if (lowerDSName === 'webofscience') {
        return new WosDataSource(dsConfig)
      } else if (lowerDSName === 'googlescholar') {
        return new GoogleScholarDataSource(dsConfig)
      }
    } else {
      return undefined
    }
  }
}