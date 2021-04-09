import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonsByInstitutionByYear (institutionNames, pubYearMin, pubYearMax, memberYearMin, memberYearMax, minConfidence) {
  const startDateLT = `1/1/${memberYearMax + 1}`
  const endDateGT = `12/31/${memberYearMin - 1}`
  let namesString = ''
  // for now manually construct the string for names in the array
  _.forEach(institutionNames, (value, index) => {
    if (index > 0) {
      namesString = `${namesString},`
    }
    namesString = `${namesString}"${value}"`
  })

  return {
    query: gql`
      query MyQuery {
        persons(
          where: {
            _and: [
              {start_date: {_lt: "${startDateLT}"}}, 

              {institution: {name: {_in: [${namesString}]}}},
              {
                _or: [
                  {end_date: {_gt: "${endDateGT}"}}, 
                  {end_date: {_is_null: true}}
                ]
              }
            ]
          }
        ) {
          id
          given_name
          family_name
          institution {
            name
          }
          confidencesets_persons_publications(
            distinct_on: doi, 
            order_by: {
              doi: asc, 
              datetime: desc
            }, 
            where: {
              year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}},
              value: {_gte: "${minConfidence}"},
            }
          ) {
            doi
            value
            year
          }
          persons_publications_metadata_aggregate (distinct_on: doi, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}}) {
            aggregate {
              count(columns: doi)
            }
          }
          persons_namevariances {
            family_name
            given_name
            id
          }
        }
      }
    `
  }
}
