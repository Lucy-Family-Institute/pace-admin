import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import MeiliSearch from 'meilisearch'
import util from 'util'
import Cite from 'citation-js'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT
const meiliKey = process.env.MEILI_KEY
const meiliUrl = `${process.env.APP_BASE_URL}/api/search/`

const sleep = util.promisify(setTimeout)

const searchClient = new MeiliSearch({
  host: `http://127.0.0.1:7700`, // todo fix this sometime
  apiKey: meiliKey
})

const gqlClient = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

function getImpactFactorValue (doc) {
  return _.find(
    _.get(doc.publication, 'journal.journals_impactfactors', []), 
    function ( factor ) {
      // console.log(`Processing impact factors: ${JSON.stringify(factor, null, 2)}`)
      // console.log(`Testing ${JSON.stringify(factor, null, 2)} against ${_.get(doc.publication, 'year')}`)
      return Number.parseInt(factor.year) === Number.parseInt(_.get(doc.publication, 'year'))
    }
  )
}

function getImpactFactorRange (impactFactor) {
  let impactFactorLevel = 'Low (0-1)'
  if (impactFactor && impactFactor['impactfactor']) {
    const factorVal = Number.parseFloat(impactFactor['impactfactor'])
    if (factorVal >= 10) {
      impactFactorLevel = 'High (10+)'
    } else if (factorVal >= 2) {
      impactFactorLevel = 'Medium (2-9)'
    }
  }
  return impactFactorLevel
}

function getUpdatedPublicationYear (csl) {
  // look for both online and print dates, and make newer date win if different
  // put in array sorted by date

  let years = []
  years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
  years.push(_.get(csl, 'issued.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
  years.push(_.get(csl, 'published-online.date-parts[0][0]', null))

  years = _.sortBy(years, (year) => { return year === null ? 99999 : Number.parseInt(year) }) // .reverse()
  if (years.length > 0 && years[0] > 0) {
    // return the most recent year
    return years[0]
  } else {
    return null
  }
}

function getCitationApa (cslString) {
  const csl = JSON.parse(cslString)

  try {
    // update publication year to be current if can, otherwise leave as is
    const publicationYear = getUpdatedPublicationYear(csl)
    if (publicationYear !== null && publicationYear > 0) {
      csl['issued']['date-parts'][0][0] = publicationYear
    }
  } catch (error) {
    console.log(`Warning: Was unable to update publication year for citation with error: ${error}`)
  }

  const citeObj = new Cite(csl)
  // create formatted citation as test
  const apaCitation = citeObj.format('bibliography', {
    template: 'apa'
  })
  // console.log(`Converted to citation: ${apaCitation}`)
  // const decodedCitation = this.decode(apaCitation)
  // trim trailing whitespace and remove any newlines in the citation
  return _.trim(apaCitation.replace(/(\r\n|\n|\r)/gm, ' '))
}

async function main() {
  console.log(await searchClient.getKeys())
  try {
    await searchClient.getIndex('publications').deleteIndex()
  } catch ( err ) {
    
  }

  let index
  try {
    index = await searchClient.createIndex('publications')
  } catch ( err ) {
    index = await searchClient.getIndex('publications')
  }

  console.log(index)

  let lowerLimit = 0
  const increment = 400
  const resultsCount = await gqlClient.query({
    query: gql`
      query MyQuery {
        persons_publications_aggregate {
          aggregate {
            max {
              id
            }
          }
        }
      }
    `
  })
  const maxId = resultsCount.data.persons_publications_aggregate.aggregate.max.id
  console.log(`Max id found: ${maxId}`)
  const times = maxId / increment
  let loops = Number.parseInt(`${times}`)
  const mod = maxId % increment
  if (mod > 0) loops = loops + 1
  console.log(`Will query '${loops}' times for max id: '${maxId}' and max result size: '${increment}'`)
  const publications = []
  for (let index = 0; index < loops; index++) {
    console.log(`Query for personPublications ${lowerLimit+1} to ${lowerLimit + increment}...`)
    const results = await gqlClient.query({
      query: gql`
      query MyQuery {
        persons_publications(limit: ${increment}, order_by: {id: asc}, 
          where: {
            id: {_gt: ${lowerLimit}}, 
            reviews: {review_type: {_eq: accepted},
            review_organization_value: {_neq: ND}},
            org_reviews: {review_type: {_eq: "accepted"}, 
            review_organization_value: {_eq: "ND"}}}
        ){
          id
          org_reviews(where: {review_organization_value: {_eq: "ND"}}, order_by: {datetime: desc}, limit: 1) {
            review_type
            review_organization_value
          }
          reviews(where: {review_organization_value: {_neq: ND}}, order_by: {datetime: desc}, limit: 1) {
            review_type
            review_organization_value
            review_organization {
              comment
            }
          }
          publication {
            id
            abstract
            doi
            title
            year
            csl_string
            journal_title: csl(path:"container-title")
            journal {
              title
              journal_type
              journals_classifications {
                classification {
                  identifier
                  name
                }
              }
              journals_impactfactors {
                year
                impactfactor
              }
              publisher
            }
            awards {
              id
              funder_award_identifier
              funder_name
              source_name
            }
          }
          person {
            family_name
            given_name
            id
          }
        }
      }  
      `
    })
    publications.push(results.data.persons_publications)
    lowerLimit = lowerLimit + increment
  }
  
  const flatPublications = _.flatten(publications)

  // now map them to person publication by id
  const mapById = {}
  _.each(flatPublications, (publication) => {
    mapById[publication.id] = publication
  })
  console.log(`Found '${_.keys(mapById).length}' personPubs`)

  const topLevelClassifications = {
    '10': 'Multidisciplinary',
    '11':  'Agricultural and Biological Sciences',
    '12' : 'Arts and Humanities',
    '13' : 'Biochemistry, Genetics and Molecular Biology',
    '14' : 'Business, Management and Accounting',
    '15' : 'Chemical Engineering',
    '16' : 'Chemistry',
    '17' : 'Computer Science',
    '18' : 'Decision Sciences',
    '19' : 'Earth and Planetary Sciences',
    '20' : 'Economics, Econometrics and Finance',
    '21' : 'Energy',
    '22' : 'Engineering',
    '23' : 'Environmental Science',
    '24' : 'Immunology and Microbiology',
    '25' : 'Materials Science',
    '26' : 'Mathematics',
    '27' : 'Medicine',
    '28' : 'Neuroscience',
    '29' : 'Nursing',
    '30' : 'Pharmacology, Toxicology and Pharmaceutics',
    '31' : 'Physics and Astronomy',
    '32' : 'Psychology',
    '33' : 'Social Sciences',
    '34' : 'Veterinary',
    '35' : 'Dentistry',
    '36' : 'Health Professions'
  }

  const documents = _.chain(_.values(mapById))
    .map((doc) => {
      if (doc.reviews[0].review_type !== 'accepted')
        return null
      const impactFactor =  getImpactFactorValue(doc)
      //set range value for impact factor
      const impactFactorLevel = getImpactFactorRange(impactFactor)
      return {
        id: `${doc.publication.id}`,
        type: 'publication',
        doi: _.get(doc.publication, 'doi'),
        title: _.get(doc.publication, 'title'),
        year: _(_.get(doc.publication, 'year')).toString(),
        abstract: _.get(doc.publication, 'abstract', null),
        journal: _.get(doc.publication, 'journal_title', null),
        journal_type: _.get(doc.publication, 'journal.journal_type', null),
        classificationsTopLevel: _.uniq(_.map(
          _.get(doc.publication, 'journal.journals_classifications', []),
          function ( obj ) {
            const sliced = _.chain(obj.classification.identifier).slice(0, 2).join('').value()
            return topLevelClassifications[sliced]
          }
        )),
        impact_factor: (impactFactor) ? impactFactor['impactfactor'] : 'Unavailable',
        impact_factor_range: impactFactorLevel,
        classifications: _.map(_.get(doc.publication, 'journal.journals_classifications', []), c => c.classification.name),
        authors: `${_.get(doc.person, 'family_name')}, ${_.get(doc.person, 'given_name')}`,
        publisher: _.get(doc.publication, 'journal.publisher', null),
        funder: _.uniq(_.map(
          _.get(doc.publication, 'awards', []),
          function ( award ) {
            return award.funder_name
          }
        )),
        citation: getCitationApa(doc.publication.csl_string),
        review_organization_value: _.get(doc.reviews[0], 'review_organization_value', null),
        review_organization_label: _.get(doc.reviews[0].review_organization, 'comment', null),
        wildcard: "*" // required for empty search (i.e., return all)
      }
    })
    .compact()
    .groupBy('id')
    .map(doc => _.mergeWith(
      {authors: []}, ...doc, (o, v, k) =>  k === 'authors' ? o.concat(v) : v)
    )
    .uniqBy('doi')
    .value()

  console.log(`Mapped #: ${documents.length}`)

  await index.addDocuments(documents)

  console.log(`Documents added`)

  let status
  const { updateId } = await index.updateAttributesForFaceting([
    'year', 'type', 'journal', 'classifications', 'authors', 'journal_type', 'publisher', 'classificationsTopLevel', 'funder', 'impact_factor_range', 'review_organization_value', 'review_organization_label'
  ])
  do {
    await sleep(10)
    status = await index.getUpdateStatus(updateId)
  } while (status.status !== 'processed')
}

main()
