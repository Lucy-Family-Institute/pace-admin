import { loadPublications } from '../loadPublications'
import _ from 'lodash'

const testCSVPath = './test/fixtures/scopus.2019.csv'

const defaultNormedPerson: NormedPerson = {
  id: 94,
  familyName: 'Zhang',
  givenNameInitial: 'S',
  givenName: 'Siyuan',
  startDate: new Date('2017-01-01'),
  endDate: undefined,
  sourceIds: {
    scopusAffiliationId: '60021508'
  }
}

const defaultSourceName = 'Scopus'

const defaultPubSourceMetadata = {
  "@_fa":"true",
  "link":[
      {"@_fa":"true","@ref":"self","@href":"https://api.elsevier.com/content/abstract/scopus_id/85077122528"},
      {"@_fa":"true","@ref":"author-affiliation","@href":"https://api.elsevier.com/content/abstract/scopus_id/85077122528?field=author,affiliation"},
      {"@_fa":"true","@ref":"scopus","@href":"https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=85077122528&origin=inward"},
      {"@_fa":"true","@ref":"scopus-citedby","@href":"https://www.scopus.com/inward/citedby.uri?partnerID=HzOxMe3b&scp=85077122528&origin=inward"}],
  "prism:url":"https://api.elsevier.com/content/abstract/scopus_id/85077122528",
  "dc:identifier":"SCOPUS_ID:85077122528",
  "eid":"2-s2.0-85077122528",
  "dc:title":"Oxidation-Induced Polymerization of InP Surface and Implications for Optoelectronic Applications",
  "dc:creator":"Zhang X.",
  "prism:publicationName":"Journal of Physical Chemistry C",
  "prism:issn":"19327447",
  "prism:eIssn":"19327455",
  "prism:volume":"123",
  "prism:issueIdentifier":"51",
  "prism:pageRange":"30893-30902",
  "prism:coverDate":"2019-12-26",
  "prism:coverDisplayDate":"26 December 2019",
  "prism:doi":"10.1021/acs.jpcc.9b07260",
  "citedby-count":"3",
  "affiliation":[{"@_fa":"true","affilname":"Notre Dame Radiation Laboratory","affiliation-city":"Notre Dame","affiliation-country":"United States"}],
  "prism:aggregationType":"Journal",
  "subtype":"ar",
  "subtypeDescription":"Article",
  "source-id":"5200153123",
  "openaccess":"0",
  "openaccessFlag":false
}

const defaultExpectedNormedPublication: NormedPublication = {
  searchPerson: defaultNormedPerson,
  title: 'Oxidation-Induced Polymerization of InP Surface and Implications for Optoelectronic Applications',
  journalTitle: 'Journal of Physical Chemistry C',
  doi: '10.1021/acs.jpcc.9b07260',
  publicationDate: '2019-12-26',
  datasourceName: defaultSourceName,
  sourceId: '85077122528',
  sourceMetadata: defaultPubSourceMetadata,
  journalIssn: "19327447",
  journalEIssn: "19327455"
}

const publicationColumnMap = {
  'search_person_id': 'searchPersonId',
  'search_person_family_name': 'searchPersonFamilyName',
  'search_person_given_name_initial': 'searchPersonGivenNameInitial',
  'search_person_given_name': 'searchPersonGivenName',
  'search_person_start_date': 'searchPersonStartDate',
  'search_person_end_date': 'searchPersonEndDate',
  'search_person_source_ids_scopus_affiliation_id': 'searchPersonSourceIdsScopusAffiliationId',
  title: 'title',
  'journal': 'journalTitle',
  doi: 'doi',
  'publication_date': 'publicationDate',
  'source_name': 'datasourceName',
  'source_id': 'sourceId',
  'source_metadata': 'sourceMetadata',
  'journal_issn': 'journalIssn',
  'journal_eissn': 'journalEIssn'
}

test('test load publications works with property map with no lowerCase keys or values', async () => {
  expect.hasAssertions()
  const publications: NormedPublication[] = await loadPublications(testCSVPath, publicationColumnMap)
  expect(publications).toEqual(expect.arrayContaining([defaultExpectedNormedPublication]))
})