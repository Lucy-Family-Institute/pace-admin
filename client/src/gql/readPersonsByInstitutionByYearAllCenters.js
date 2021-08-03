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
              {institution: {name: {_in: [${namesString}]}}},
              {
                _or: [
                  {
                    persons_organizations: {
                      start_date: {_lt: "${startDateLT}"},
                      end_date: {_gt: "${endDateGT}"}
                    }
                  }, 
                  {
                    persons_organizations: {
                      start_date: {_lt: "${startDateLT}"},
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
            distinct_on: title, 
            order_by: {
              title: asc, 
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
            distinct_on: title, 
            order_by: {
              title: asc, 
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
          confidencesets_persons_publications_aggregate(distinct_on: title, order_by: {title: asc, datetime: desc}, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}}) {
            nodes {
              datetime
              doi
              id
              publication_id
              value
              version
              title
            }
          }
          reviews_persons_publications_aggregate(distinct_on: title, order_by: {title: asc, datetime: desc}) {
            aggregate {
              count(columns: title)
            }
          }
          persons_publications_metadata_aggregate (distinct_on: title, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}}) {
            aggregate {
              count(columns: title)
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
