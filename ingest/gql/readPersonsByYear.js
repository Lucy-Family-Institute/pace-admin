import gql from 'graphql-tag'

export default function readPersonsByYear (year) {
  const startDateLT = `1/1/${year + 1}`
  const endDateGT = `12/31/${year - 1}`
  return {
    query: gql`
      query MyQuery {
        persons (
          where: {
            _and: [
              {start_date: {_lt: "${startDateLT}"}}, 
              {
                _or: [
                  {end_date: {_gt: "${endDateGT}"}}, 
                  {end_date: {_is_null: true}}
                ]
              }
            ]
          }, 
          order_by: {persons_publications_aggregate: {count: desc}}){
          id
          given_name
          family_name
          start_date
          end_date
          semantic_scholar_ids
          institution {
            name
          }
          persons_namevariances {
            id
            given_name
            family_name
          }
          persons_publications_aggregate {
            aggregate {
              count
            }
          }
        }
      }
    `
  }
}
