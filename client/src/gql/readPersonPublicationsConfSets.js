import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonPublicationsConfSets (institutionNames, organizationValue, pubYearMin, pubYearMax, memberYearMin, memberYearMax) {
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
        confidencesets_persons_publications(
          distinct_on: persons_publications_id,
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          },
          where: {
            person: {
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
            }, 
            publication: {
              year: {_gte: "${pubYearMin}", _lte: "${pubYearMax}"}
            }
          }      
        ) {
          id
          persons_publications_id
          person_id
          publication_id
          doi
          title
          value
          datetime
        }
      }
    `
}
