import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonsByInstitutionByYearByOrganization (organizationValue, institutionNames, pubYearMin, pubYearMax, memberYearMin, memberYearMax) {
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
                      organization_value: {_eq: ${organizationValue}},
                      end_date: {_gt: "${endDateGT}"}
                    }
                  }, 
                  {
                    persons_organizations: {
                      start_date: {_lt: "${startDateLT}"},
                      organization_value: {_eq: ${organizationValue}},
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
          start_date
          end_date
          institution {
            name
          }
          confidencesets_persons_publications(
            distinct_on: title
            order_by: {
              title: asc,
              datetime: desc
            }, 
            where: {
              year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}
            }
          ) {
            persons_publications_id
            doi
            value
            title
            year
          }
          confidencesets_persons_publications_aggregate(distinct_on: persons_publications_id, order_by: {persons_publications_id: asc, datetime: desc}, where: {year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}}) {
            nodes {
              datetime
              doi
              id
              persons_publications_id
              publication_id
              value
              version
              title
              source_name
              source_id
            }
          }
          reviews_persons_publications_aggregate(
            distinct_on: persons_publications_id, 
            order_by: {
              persons_publications_id: asc, 
              datetime: desc
            }, 
            where: {
              review_organization_value: {_eq: "ND"},
              year: {_gte: ${pubYearMin}, _lte: ${pubYearMax}}
            }
          ) {
              nodes {
                persons_publications_id
                doi
                person_id
                title
                review_type
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
          persons_organizations (
            where: {
              _or: [
                {
                  start_date: {_lt: "${startDateLT}"},
                  end_date: {_gt: "${endDateGT}"}
              }, 
                {
                  start_date: {_lt: "${startDateLT}"},
                  end_date: {_is_null: true}
                }
              ]
            })
          {
            id
            person_id
            organization_value
            start_date
            end_date
          }
        }
      }
    `
  }
}
