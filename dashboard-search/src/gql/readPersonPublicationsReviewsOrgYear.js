import gql from 'graphql-tag'
import _ from 'lodash'

export default function readPersonPublicationsOrgYear (organizationValue, year) {
  const startDateLT = `1/1/${year + 1}`
  const endDateGT = `12/31/${year - 1}`

  return gql`
      query MyQuery {
        reviews_persons_publications(
          distinct_on: persons_publications_id,
          where: {
            person: {
              _and: [
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
            year: {_eq: "${year}"},
            review_organization_value: {_eq: "${organizationValue}"}
          },
          order_by: {
            persons_publications_id: asc, 
            datetime: desc
          }
        ) {
          id
          persons_publications_id
          person_id
          publication_id
          doi
          title
          year
          review_organization {
            value
            comment
          }
          review_type
          review_organization_value
          datetime
          publication {
            id
            title
            doi
            source_name
            source_id
            journal_title: csl(path:"container-title")
            abstract
            year
            month
            day
          }
          person {
            id
            family_name
            given_name
            start_date
            end_date
          }
        }
      }
    `
}
