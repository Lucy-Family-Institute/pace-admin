import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonsByInstitutionByYearAllCenters (institutionNames, pubYearMin, pubYearMax, memberYearMin, memberYearMax, minConfidence) {
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
          distinct_on: id,
          where: {
            _and: [
              {
                persons_organizations: {
                  start_date: {_lt: "${startDateLT}"}
                }
              }, 
              {institution: {name: {_in: [${namesString}]}}},
              {
                _or: [
                  {
                    persons_organizations: {
                      end_date: {_gt: "${endDateGT}"}
                    }
                  }, 
                  {
                    persons_organizations: {
                      end_date: {_is_null: true}
                    }
                  }
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
          reviews_persons_publications(
            distinct_on: doi, 
            order_by: {
              doi: asc, 
              datetime: desc
            }, 
            where: {
              review_organization_value: {_eq: "ND"}, 
              year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}
            }) {
            doi
            person_id
            title
            review_type
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
            persons_publications_id
            title
            doi
            value
            year
          }
          reviews_persons_publications_aggregate(distinct_on: doi, order_by: {doi: asc, datetime: desc}) {
            aggregate {
              count(columns: doi)
            }
          }
          persons_publications_metadata_aggregate (distinct_on: doi, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}}) {
            aggregate {
              count(columns: doi)
            }
          }
          persons_namevariances {
            id
            person_id
            family_name
            given_name
          }
          persons_organizations {
            id
            person_id
            start_date
            end_date
          }
        }
      }
    `
  }
}
