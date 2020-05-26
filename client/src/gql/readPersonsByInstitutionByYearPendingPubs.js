import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonsByInstitutionByYearPendingPubs (institutionNames, pubYearMin, pubYearMax, memberYearMin, memberYearMax, userId) {
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

  return gql`
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
          }, 
          order_by: {persons_publications_metadata_aggregate: {count: desc}}
        ) {
          id
          given_name
          family_name
          institution {
            name
          }
          persons_publications_metadata_aggregate (distinct_on: doi, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}, _not: {reviews: {user_id: {_eq: ${userId}}}}}) {
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
