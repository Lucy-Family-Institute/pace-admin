import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonPublicationsAllJS (institutionNames, organizationValue, pubYearMin, pubYearMax, memberYearMin, memberYearMax) {
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
        persons_publications(
          where: {
            person: {
              _and: [
                {
                  persons_organizations : {
                    organization_value: {_eq: ${organizationValue}}
                  }
                }
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
            }, 
            publication: {
              year: {_gte: "${pubYearMin}", _lte: "${pubYearMax}"}
            }
          },
          order_by: {confidence: desc, publication: {title: asc}}
        ) {
          id
          person_id
          publication_id
          publication {
            id
            title
            doi
            source_name
            scopus_eid: source_metadata(path: "eid")
            pubmed_resource_identifiers: source_metadata(path: "resourceIdentifiers")
            abstract
            year
            journal {
              title
            }
          }
          person {
            id
            family_name
            given_name
          }
          confidence
        }
      }
    `
}
