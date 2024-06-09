import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import MeiliSearch from 'meilisearch'
import util from 'util'
import Cite from 'citation-js'
import PublicationGraph from '../../ingest/modules/publicationGraph'
import PublicationSet from '../../ingest/modules/publicationSet'
// import pMap from 'p-map'

import readOrganizationValues from './gql/readOrganizationValues'
import readPersonPublicationsReviewsOrgYear from './gql/readPersonPublicationsReviewsOrgYear'
import readPublicationsJournals from './gql/readPublicationsJournals'
import readPublicationsAwards from './gql/readPublicationsAwards'
import readPersonPublicationsReviews from '../../client/src/gql/readPersonPublicationsReviews'
import readPublicationsCSL from '../../client/src/gql/readPublicationsCSL'

import dotenv from 'dotenv'
import moment from 'moment'
import NormedPersonPublication from '../../ingest/modules/normedPersonPublication'
import PublicationSetGraphNode from '../../ingest/modules/publicationSetGraphNode'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT
const meiliKey = process.env.MEILI_KEY
const meiliUrl = `${process.env.APP_BASE_URL}/api/search/`

const sleep = util.promisify(setTimeout)

const searchClient = new MeiliSearch({
  host: `${process.env.MEILI_HOST}`, // todo fix this sometime
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
      return Number.parseInt(factor.year) === (Number.parseInt(_.get(doc.publication, 'year')) - 1)
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

async function getPublicationsReviewsOrgYear(organizationValue, year) {
  const pubsWithReviewResult = await gqlClient.query({
    query: readPersonPublicationsReviewsOrgYear(organizationValue, year),
    fetchPolicy: 'network-only'
  })
  return pubsWithReviewResult.data.reviews_persons_publications
}

async function loadPubsWithJournals(publicationIds) {
  const pubsWithJournals = await gqlClient.query({
    query: readPublicationsJournals(publicationIds),
    fetchPolicy: 'network-only'
  })
  return pubsWithJournals.data.publications
}

async function loadPubsWithAwards(publicationIds) {
  const pubsWithJournals = await gqlClient.query({
    query: readPublicationsAwards(publicationIds),
    fetchPolicy: 'network-only'
  })
  return pubsWithJournals.data.publications
}

async function loadPubsWithCSL(publicationIds) {
  const pubsWithCSL = await gqlClient.query({
    query: readPublicationsCSL(publicationIds),
    fetchPolicy: 'network-only'
  })
  return pubsWithCSL.data.publications
}

async function loadPublications (organizationValue, years) {
  
  // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
  // this.publications = result.data.publications
  let publications = []
  for (let i=0; i < years.length; i++) {
    console.log(`Query publications for org: ${organizationValue} year: ${years[i]}...`)
    const pubsWithReviewResult = await getPublicationsReviewsOrgYear(organizationValue, years[i])
    // console.log(`Pubs with review result year: ${years[i]} count: ${pubsWithReviewResult.length}`)

    const personPubOrgReviewsByType = _.groupBy(pubsWithReviewResult, (reviewPersonPub) => {
      return reviewPersonPub.review_type
    })

    // console.log(`Person Pubs with review: ${JSON.stringify(personPubOrgReviewsByType["accepted"].length)}`)

    const personPubByIds = _.mapKeys(personPubOrgReviewsByType['accepted'], (personPub) => {
      return personPub.persons_publications_id
    })

    // // for now assume only one review, needs to be fixed later
    const pubsWithNDReviewsResult = await gqlClient.query({
      query: readPersonPublicationsReviews(_.keys(personPubByIds), 'ND'),
      fetchPolicy: 'network-only'
    })

    const personPubNDReviewsByType = _.groupBy(pubsWithNDReviewsResult.data.reviews_persons_publications, (reviewPersonPub) => {
      return reviewPersonPub.review_type
    })

    const personPubNDReviews = _.groupBy(pubsWithNDReviewsResult.data.reviews_persons_publications, (reviewPersonPub) => {
      return reviewPersonPub.persons_publications_id
    })

    const personPubNDReviewsAccepted = personPubNDReviewsByType['accepted']

    // load journals and awards for publications, break these into separate queries bc too slow to do at once
    const publicationIds = _.uniq(_.map(pubsWithReviewResult, (pub) => {
      return pub.publication.id
    }))

    const pubsWithJournals = await loadPubsWithJournals(publicationIds)
    let journalsByPubIds = {}
    _.each(pubsWithJournals, (pub) => {
      journalsByPubIds[pub.id] = pub.journal
    })
    const pubsWithAwards = await loadPubsWithAwards(publicationIds)
    let awardsByPubIds = {}
    _.each(pubsWithAwards, (pub) => {
      awardsByPubIds[pub.id] = pub.awards
    })
    // now get csl
    const pubsWithCSL = await loadPubsWithCSL(publicationIds)
    let cslByPubIds = {}
    _.each(pubsWithCSL, (pub) => {
      cslByPubIds[pub.id] = pub.csl_string
    })


    publications = _.concat(publications, _.map(personPubNDReviewsAccepted, (personPubReview) => {
      const personPub = personPubByIds[personPubReview.persons_publications_id]
      _.set(personPub.publication, 'journal', journalsByPubIds[personPub.publication.id])
      _.set(personPub.publication, 'awards', awardsByPubIds[personPub.publication.id])
      _.set(personPub.publication, 'csl_string', cslByPubIds[personPub.publication.id])
  //       _.set(personPub, 'confidencesets', _.cloneDeep(personPubConfidenceSets[personPubReview.persons_publications_id]))
  //       _.set(personPub, 'reviews', _.cloneDeep(personPubNDReviews[personPubReview.persons_publications_id]))
  //       _.set(personPub, 'org_reviews', _.cloneDeep(personPubCenterReviews[personPubReview.persons_publications_id]))
  //    
      return personPub
    }))
  }
  return publications
}

async function getOrganizationValues() {
  const results = await gqlClient.query({
    query: readOrganizationValues()
  })

  const orgValues = _.map(results.data.review_organization, (reviewOrg) => {
   return reviewOrg.value
  })
  return orgValues
}

function getNormedPersonPublications(reviewPersonPublications) {
  let normedPersonPubs: NormedPersonPublication[] = []
  _.each(reviewPersonPublications, (pub) => {
    const normedPersonPub: NormedPersonPublication = {
      id: pub.persons_publications_id,
      person_id: pub.person_id,
      person: pub.person,
      title: pub.title,
      doi: pub.doi,
      sourceName: pub.source_name,
      sourceId: pub.publication.source_id,
      reviewTypeStatus: pub.review_type,
      personPublication: pub
    }
    normedPersonPubs.push(normedPersonPub)
  })
  return normedPersonPubs
}

async function main() {
  console.log(await searchClient.getKeys())
  try {
    console.log("-------------get publications index to refresh if exists-------------")
    let index = await searchClient.getIndex('publications')
    index.delete()
  } catch ( err ) {
    
  }

  let index
  try {
    console.log("-------------try creating publications index-------------")
    index = await searchClient.createIndex('publications')
  } catch ( err ) {
    console.log("-------------get existing publications index-------------")
    index = await searchClient.getIndex('publications')
  }

  console.log("-------------index is:-------------")
  console.log(index)
  console.log("--------------end index is:-----------------")

  const thisYear = Number.parseInt(moment().format('YYYY'))
  const startYear = thisYear - 4
  const years = []
  for (let j=0; j < 5; j++) {
    years.push(startYear + j)
  }

  const reviewTypes = ["accepted"]
  const organizationValues = await getOrganizationValues()
  const publicationGraphs: PublicationGraph[] = []

  // const organizationValues = ['NDNANO','IPH']
  for (let i=0; i < organizationValues.length; i++) {
    for (let j=0; j < years.length; j++) {
      const flatPublications = await loadPublications(organizationValues[i], [years[j]])
      const normedPersonPubs = getNormedPersonPublications(flatPublications)

      const publicationGraph = PublicationGraph.createPublicationGraph(reviewTypes,false)

      publicationGraph.addToGraph(normedPersonPubs)
      console.log(`pub sets total: ${publicationGraph.getAllPublicationSets().length}`)

      publicationGraphs.push(publicationGraph)
    }
  }

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


  const documents = []
  _.each(publicationGraphs, (publicationGraph) => {
    const pubSets = publicationGraph.getAllPublicationSets()
    _.each(pubSets, (pubSet: PublicationSet) => {
      let authors = []
      _.each(pubSet.personPublications, (personPub) => {
        const author = `${_.get(personPub.person, 'family_name')}, ${_.get(personPub.person, 'given_name')}`
        authors.push(author)
      })
      authors = _.uniq(authors)

      const doc = pubSet.mainPersonPub.personPublication
      // if (doc.reviews[0].review_type !== 'accepted')
      //   return null
      const impactFactor =  getImpactFactorValue(doc)
      //set range value for impact factor
      const impactFactorLevel = getImpactFactorRange(impactFactor)
      const addDoc =  {
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
        authors: authors,
        // authors: `${_.get(doc.person, 'family_name')}, ${_.get(doc.person, 'given_name')}`,
        publisher: _.get(doc.publication, 'journal.publisher', null),
        funder: _.uniq(_.map(
          _.get(doc.publication, 'awards', []),
          function ( award ) {
            return award.funder_name
          }
        )),
        citation: getCitationApa(doc.publication.csl_string),
        review_organization_value: _.get(doc.review_organization, 'review_organization_value', null),
        review_organization_label: _.get(doc.review_organization, 'comment', null),
        wildcard: "*" // required for empty search (i.e., return all)
      }
      documents.push(addDoc)
    })
  })

  // need to add swapping indexes instead of blowing away and ability to roll-back if needed -> keep last
  console.log(`Mapped #: ${documents.length}`)
  const indexes = await searchClient.getIndexes() 
  console.log(`${JSON.stringify(indexes['results'])}`)
  //index = await searchClient.getIndex('publications')
  
  const status = await searchClient.index('publications').addDocuments(documents)
  //indexes['results'].

  console.log(`Add Document Task Created: ${JSON.stringify(status)}`)
  console.log(`Documents added`)

  let task
  // await searchClient.index('publications').updateFilterableAttributes([
  //   'year', 'type', 'journal', 'classifications', 'authors', 'journal_type', 'publisher', 'classificationsTopLevel', 'funder', 'impact_factor_range', 'review_organization_value', 'review_organization_label'
  // ])

  
  
  do {
    console.log(".")
    await sleep(10)
    task = await searchClient.getTask(status.taskUid)
    console.log(`${JSON.stringify(task)}`)
  } while (task.status == 'processing' || task.status == 'enqueued')
  const addedDocuments = await searchClient.index('publications').getDocuments()
  console.log(`Added Documents Total: ${JSON.stringify(addedDocuments.results.length)}`)

  const facetTask = await searchClient.index('publications').updateFilterableAttributes([
    'year', 'type', 'journal', 'classifications', 'authors', 'journal_type', 'publisher', 'classificationsTopLevel', 'funder', 'impact_factor_range', 'review_organization_value', 'review_organization_label'
  ])

  let facetStatus
  do {
    await sleep(10)
    facetStatus = await searchClient.getTask(facetTask.taskUid)
    console.log(`Updating facets...${JSON.stringify(facetStatus.status)}`)
  } while (facetStatus.status == 'processing' || facetStatus.status == 'enqueued')
  console.log(`${JSON.stringify(facetStatus)}`)

  const filterableAttributes = await searchClient.index('publications').getFilterableAttributes()
  console.log(`Filterable attributes are: ${JSON.stringify(filterableAttributes)}`)

}

main()