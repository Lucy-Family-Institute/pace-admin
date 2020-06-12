<template>
  <div>
    <div class="q-pa-md">
      <q-drawer
        v-model="drawer"
        @click.capture="drawerClick"
        show-if-above

        :width="250"
        :breakpoint="500"
        bordered
        content-class="bg-grey-3"
      >
        <div class="absolute" style="top: 70px">
          <q-btn flat
            @click="resetFilters()"
            class="text-grey-8"
            style="align:left;width:100%"
          >
            <q-item-section class="q-pl-lg" align="right" avatar>
              <q-icon name="replay"/>
            </q-item-section>
            <q-item-section header align="left">Clear All</q-item-section>
          </q-btn>
          <q-item-label header>Publication Filter</q-item-label>
          <YearFilter />
          <q-item-label header>Person Filter</q-item-label>
          <MemberYearFilter />
          <PeopleFilter />
          <div class="q-mini-drawer-hide absolute" style="top: 70px; right: -17px">
            <q-btn
              v-if="drawer"
              dense
              round
              unelevated
              color="teal"
              icon="chevron_left"
              @click="drawer = false"
            />
          </div>
        </div>
      </q-drawer>
      <q-splitter
        v-model="firstModel"
        unit="px"
        :style="{height: ($q.screen.height-56-16)+'px'}"
      >
        <template v-slot:before>
          <q-btn flat
            @click="drawer = !drawer"
            class="text-grey-8"
            style="align:left;width:100%"
          >
            <q-item-section avatar>
              <q-icon name="tune"/>
            </q-item-section>
            <q-item-section header align="left">Filter</q-item-section>
          </q-btn>
            <q-item-label header>Dashboard</q-item-label>
          </template>
      </q-splitter>
    </div>
  </div>
</template>

<style>
  .vue-friendly-iframe iframe {
    padding: 0;
    margin: 0;
    width: 100%;
    height: var(--height);
  }
</style>

<script>
import Vue from 'vue'
import { get, sync } from 'vuex-pathify'
import { dom, date } from 'quasar'
// const { getScrollPosition, setScrollPosition } = scroll
import readPersons from '../gql/readPersons'
// import readPersonsByInstitution from '../gql/readPersonsByInstitution'
// import readPublicationsByPerson from '../gql/readPublicationsByPerson'
// import readPublicationsByPersonByReview from '../gql/readPublicationsByPersonByReview'
import readAuthorsByPublication from '../gql/readAuthorsByPublication'
import readConfidenceSetItems from '../gql/readConfidenceSetItems'
import insertReview from '../gql/insertReview'
// import readUser from '../gql/readUser'
// import readInstitutions from '../gql/readInstitutions'
import _ from 'lodash'
import Cite from 'citation-js'

import readPersonsByInstitutionByYear from '../gql/readPersonsByInstitutionByYear'
import readPersonsByInstitutionByYearPendingPubs from '../gql/readPersonsByInstitutionByYearPendingPubs'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import readPublications from '../gql/readPublications'
// import readPendingPublications from '../../../gql/readPendingPublications.gql'
import readPersonPublicationsAll from '../gql/readPersonPublicationsAll'
// import readPublicationsByReviewState from '../../../gql/readPublicationsByReviewState.gql'
import readPublication from '../../../gql/readPublication.gql'
// import * as service from '@porter/osf.io';

import PeopleFilter from '../components/PeopleFilter.vue'
import YearFilter from '../components/YearFilter.vue'
import MemberYearFilter from '../components/MemberYearFilter.vue'
import sanitize from 'sanitize-filename'
import moment from 'moment'

export default {
  name: 'PageIndex',
  components: {
    PeopleFilter,
    YearFilter,
    MemberYearFilter
  },
  data: () => ({
    reviewStates: undefined,
    selectedReviewState: undefined,
    dom,
    date,
    firstModel: 800,
    secondModel: 500,
    people: [],
    publications: [],
    publicationsGroupedByReview: {},
    personPublicationsCombinedMatches: [],
    personPublicationsCombinedMatchesByReview: {},
    filteredPersonPublicationsCombinedMatchesByReview: {},
    publicationsGroupedByDoiByReview: {},
    institutions: [],
    institutionGroup: [],
    personPublication: undefined,
    publication: undefined,
    links: [],
    checkedPublications: [],
    url: undefined,
    unpaywall: undefined,
    unpaywallThumbnail: undefined,
    dialog: false,
    maximizedToggle: true,
    person: undefined,
    user: undefined,
    username: undefined,
    institutionId: undefined,
    nameVariants: [],
    publicationAuthors: [],
    confidenceSetitems: [],
    confidenceSet: undefined,
    matchedPublicationAuthors: [],
    reviewQueueKey: 0,
    publicationCitation: undefined,
    showReviewStates: [],
    // for progress bar
    progress: 0,
    buffer: 0,
    publicationsLoaded: false,
    publicationsLoadedError: false,
    showProgressBar: false,
    authorColumns: [
      { name: 'position', align: 'left', label: 'Position', field: 'position', sortable: true },
      { name: 'family_name', align: 'left', label: 'Family Name', field: 'family_name', sortable: true },
      { name: 'given_name', align: 'left', label: 'Given Name', field: 'given_name', sortable: true }
    ],
    confidenceColumns: [
      { name: 'value', align: 'left', label: 'Value', field: 'value', sortable: true },
      { name: 'rank', align: 'left', label: 'Rank', field: 'confidence_type_rank', sortable: true },
      { name: 'type_desc', align: 'left', label: 'Desc', field: 'confidence_type_desc', sortable: false },
      { name: 'comment', align: 'left', label: 'Comment', field: 'comment', sortable: false }
    ],
    pagination: {
      page: 1,
      rowsPerPage: 0 // 0 means all rows
    },
    reviewTypeFilter: 'pending',
    publicationsReloadPending: false,
    drawer: false,
    miniState: false
  }),
  beforeDestroy () {
    clearInterval(this.interval)
    clearInterval(this.bufferInterval)
  },
  async created () {
    await this.fetchData()
  },
  watch: {
    $route: 'fetchData',
    selectedInstitutions: function () {
      this.loadPublications()
    },
    changedPubYears: async function () {
      await this.loadPublications()
    },
    changedMemberYears: async function () {
      await this.loadPublications()
    },
    selectedPersonSort: function () {
      // re-sort people
      this.loadPersonsWithFilter()
    },
    pubSearch: function () {
      this.setCurrentPersonPublicationsCombinedMatches()
    },
    selectedPersonPubSort: async function () {
      await this.sortPublications()
      this.showCurrentSelectedPublication()
    },
    selectedPersonTotal: function () {
      this.loadPersonsWithFilter()
    },
    publicationsGroupedByView: function () {
      this.loadPublications()
    },
    reviewTypeFilter: function () {
      if (this.publicationsReloadPending) {
        this.loadPublications()
        this.publicationsReloadPending = false
      } else {
        this.setCurrentPersonPublicationsCombinedMatches()
      }
    }
  },
  methods: {
    drawerClick (e) {
      // if in "mini" state and user
      // click on drawer, we switch it to "normal" mode
      if (this.miniState) {
        this.miniState = false

        // notice we have registered an event with capture flag;
        // we need to stop further propagation as this click is
        // intended for switching drawer to "normal" mode only
        e.stopPropagation()
      }
    },
    getPublicationSourceId (personPublication) {
      if (personPublication.publication.source_name.toLowerCase() === 'scopus' &&
        personPublication.publication.scopus_eid) {
        return personPublication.publication.scopus_eid
      } else if (personPublication.publication.source_name.toLowerCase() === 'pubmed' &&
        personPublication.publication.pubmed_resource_identifiers &&
        _.isArray(personPublication.publication.pubmed_resource_identifiers)) {
        const resourceId = _.find(personPublication.publication.pubmed_resource_identifiers, (id) => {
          return id['resourceIdentifierType'] === 'pmc'
        })
        if (resourceId) {
          return resourceId['resourceIdentifier']
        } else {
          return undefined
        }
      } else if (personPublication.publication.source_name.toLowerCase() === 'crossref') {
        return personPublication.publication.doi
      } else {
        return undefined
      }
    },
    // sort person pubs by source so chips in screen always in same order
    getSortedPersonPublicationsBySourceName (personPublications) {
      return _.sortBy(personPublications, (personPublication) => {
        return personPublication.publication.source_name
      })
    },
    getDisplaySourceLabel (personPublication) {
      const sourceId = this.getPublicationSourceId(personPublication)
      let sourceName = personPublication.publication.source_name
      if (sourceId) {
        return `${sourceName}: ${sourceId}`
      } else {
        return sourceName
      }
    },
    // depending on the source return source uri
    getSourceUri (personPublication) {
      const sourceId = this.getPublicationSourceId(personPublication)
      if (sourceId) {
        if (personPublication.publication.source_name.toLowerCase() === 'scopus') {
          return this.getScopusUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'pubmed') {
          return this.getPubMedUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'crossref') {
          return this.getDoiUrl(personPublication.publication.doi)
        }
      } else {
        return undefined
      }
    },
    // expects an e-id of the form '2-s2.0-85048483099' to go directly to the resource in scopus
    getScopusUri (scopusEid) {
      return `${process.env.SCOPUS_ARTICLE_URI_BASE}/record/display.uri?origin=resultslist&eid=${scopusEid}`
    },
    getPubMedUri (pmcId) {
      return `${process.env.PUBMED_ARTICLE_URI_BASE}/pmc/articles/${pmcId}`
    },
    getPublicationsGroupedByDoiByReviewCount (reviewType) {
      return this.filteredPersonPublicationsCombinedMatchesByReview[reviewType] ? this.filteredPersonPublicationsCombinedMatchesByReview[reviewType].length : 0
    },
    decode (str) {
      const textArea = document.createElement('textarea')
      textArea.innerHTML = str
      return textArea.value
    },
    getSourceNameChipColor (sourceName) {
      if (sourceName) {
        if (sourceName.toLowerCase() === 'pubmed') {
          return 'blue'
        } else if (sourceName.toLowerCase() === 'scopus') {
          return 'orange'
        } else if (sourceName.toLowerCase() === 'crossref') {
          return 'purple'
        } else {
          return 'teal'
        }
      } else {
        return 'teal'
      }
    },
    // return all duplicate publications
    async reportDuplicatePublications () {
      const pubResults = await this.$apollo.query(readPublications())
      const publications = pubResults.data.publications
      // group pubs by doi
      const pubsByDoi = _.groupBy(publications, (pub) => { return pub.doi })
      _.forEach(_.keys(pubsByDoi), (doi) => {
        if (pubsByDoi[doi].length > 2) {
          console.log(`Duplicate doi found: ${doi} items: ${JSON.stringify(pubsByDoi[doi], null, 2)}`)
        }
      })
    },
    async resetReviewTypeFilter () {
      this.reviewTypeFilter = 'pending'
    },
    async startProgressBar () {
      this.publicationsLoaded = false
      this.publicationsLoadedError = false
      this.resetProgressBar()
      await this.runProgressBar()
    },
    async resetProgressBar () {
      this.buffer = 0
      this.progress = 0
      this.showProgressBar = true
      clearInterval(this.interval)
      clearInterval(this.bufferInterval)
    },
    async runProgressBar () {
      this.interval = setInterval(() => {
        if (this.publicationsLoaded && this.progress > 0) {
          if (this.progress === 1) {
            // set show progress bar to false the second time called so bar completes before hiding
            this.showProgressBar = false
          } else {
            this.progress = 1
          }
          return
        } else if (this.progress >= 1) {
          this.progress = 0.01
          this.buffer = 0.01
          return
        }

        this.progress = Math.min(1, this.buffer, this.progress + 0.1)
      }, 700 + Math.random() * 1000)

      this.bufferInterval = setInterval(() => {
        if (this.buffer < 1) {
          this.buffer = Math.min(1, this.buffer + Math.random() * 0.2)
        }
      }, 700)
    },
    showReviewState (reviewState) {
      const test = _.includes(this.filterReviewStates, reviewState.name)
      console.log(`checking show review state for: ${reviewState.name} result is: ${test}, filter review states are: ${JSON.stringify(this.filterReviewStates, null, 2)}`)
      return test
    },
    async setSelectedReviewState (reviewState) {
      this.selectedReviewState = reviewState
    },
    async scrollToPublication (index) {
      console.log(`updating scroll ${index} for ${this.selectedReviewState} ${this.$refs['pubScroll'].toString}`)
      this.$refs['pubScroll'].scrollTo(index + 1)
    },
    async showCurrentSelectedPublication () {
      if (this.person && this.personPublication) {
        // check people still contains the person if not clear out states
        const currentPubIndex = _.findIndex(this.personPublicationsCombinedMatches, (personPublication) => {
          return personPublication.id === this.personPublication.id
        })
        if (currentPubIndex >= 0) {
          let scrollIndex = currentPubIndex
          if (scrollIndex > 1) {
            // if greater than 2 move up 2 spaces
            scrollIndex += 2
          }
          await this.$refs['pubScroll'].scrollTo(scrollIndex)
          // console.log(this.$refs)
          this.$refs[`personPub${currentPubIndex}`].show()
        } else {
          console.log(`Person Publication id: ${this.personPublication.id} no longer found.  Clearing UI states...`)
          // clear everything out
          this.clearPublication()
        }
      }
    },
    async showCurrentSelectedPerson () {
      if (this.person && this.people) {
        // check people still contains the person if not clear out states
        const currentPersonIndex = _.findIndex(this.people, (currentPerson) => {
          return currentPerson.id === this.person.id
        })
        if (currentPersonIndex >= 0) {
          console.log(`Trying to show person ${this.person.id}`)
          // if not top item scroll to 2 items above
          let scrollIndex = currentPersonIndex
          if (scrollIndex > 1) {
            // if greater than 2 move up 2 spaces
            scrollIndex -= 2
          }
          await this.$refs['personScroll'].scrollTo(scrollIndex)
          // console.log(this.$refs)
          this.$refs[`person${currentPersonIndex}`].show()
        } else {
          console.log(`Person id: ${this.person.id} no longer found.  Clearing UI states...`)
          // clear everything out
          this.person = undefined
          this.clearPublication()
          this.clearPublications()
        }
      }
    },
    async loadPersonsWithFilter () {
      console.log('filtering', this.selectedInstitutions)
      this.people = []
      console.log(`Applying year filter to person search year min: ${this.selectedPubYears.min} max: ${this.selectedPubYears.max}`)
      if (this.selectedPersonTotal === 'All') {
        const personResult = await this.$apollo.query(readPersonsByInstitutionByYear(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max))
        this.people = personResult.data.persons
      } else {
        const personResult = await this.$apollo.query({
          query: readPersonsByInstitutionByYearPendingPubs(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max, this.userId),
          fetchPolicy: 'network-only'
        })
        this.people = personResult.data.persons
      }

      // apply any sorting applied
      console.log('filtering', this.selectedPersonSort)
      if (this.selectedPersonSort === 'Name') {
        this.people = await _.sortBy(this.people, ['family_name', 'given_name'])
      } else {
        // need to sort by total and then name, not guaranteed to be in order from what is returned from DB
        // first group items by count
        const peopleByCounts = await _.groupBy(this.people, (person) => {
          return person.persons_publications_metadata_aggregate.aggregate.count
        })

        // sort each person array by name for each count
        const peopleByCountsByName = await _.mapValues(peopleByCounts, (persons) => {
          return _.sortBy(persons, ['family_name', 'given_name'])
        })

        // get array of counts (i.e., keys) sorted in reverse
        const sortedCounts = await _.sortBy(_.keys(peopleByCountsByName), (count) => { return Number.parseInt(count) }).reverse()

        // now push values into array in desc order of count and flatten
        let sortedPersons = []
        await _.each(sortedCounts, (key) => {
          sortedPersons.push(peopleByCountsByName[key])
        })

        this.people = await _.flatten(sortedPersons)
        // this.reportDuplicatePublications()
      }
      if (this.person) {
        this.showCurrentSelectedPerson()
      }
    },
    async loadReviewStates () {
      console.log('loading review states')
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewTypes
      })
      // console.log(`Review Type Results: ${JSON.stringify(reviewStatesResult.data, null, 2)}`)
      this.reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
        // console.log(`Current type review is: ${JSON.stringify(typeReview, null, 2)}`)
        return typeReview.value
      })
      this.showReviewStates = _.filter(this.reviewStates, (value) => { return this.showReviewState(value) })
      // console.log(`Show Review states initialized to: ${this.showReviewStates} Review states are: ${this.reviewStates}`)
    },
    async loadPersons () {
      const personResult = await this.$apollo.query(readPersons())
      this.people = personResult.data.persons
    },
    async loadPublicationAuthors (personPublication) {
      this.publicationAuthors = []
      const publicationId = personPublication.publication.id
      const result = await this.$apollo.query(readAuthorsByPublication(publicationId))
      this.publicationAuthors = result.data.publications_authors
      console.log(`Loaded Publication Authors: ${JSON.stringify(this.publicationAuthors)}`)
      // load up author positions of possible matches
      this.matchedPublicationAuthors = _.filter(this.publicationAuthors, function (author) {
        return author.family_name.toLowerCase() === personPublication.person.family_name.toLowerCase()
      })
      console.log(`Matched authors are: ${JSON.stringify(this.matchedPublicationAuthors, null, 2)}`)
    },
    async loadConfidenceSet (personPublication) {
      this.confidenceSetItems = []
      this.confidenceSet = undefined
      console.log(`Trying to load confidence sets for pub: ${JSON.stringify(personPublication, null, 2)}`)
      if (personPublication.confidencesets_aggregate &&
        personPublication.confidencesets_aggregate.nodes.length > 0) {
        this.confidenceSet = personPublication.confidencesets_aggregate.nodes[0]
        console.log('getting confidence set items...')
        const result = await this.$apollo.query(readConfidenceSetItems(this.confidenceSet.id))
        this.confidenceSetItems = result.data.confidencesets_items
        this.confidenceSetItems = _.transform(this.confidenceSetItems, (result, setItem) => {
          console.log(`Trying to set properties for confidence set item: ${JSON.stringify(setItem, null, 2)}`)
          _.set(setItem, 'confidence_type_name', setItem.confidence_type.name)
          _.set(setItem, 'confidence_type_rank', setItem.confidence_type.rank)
          _.set(setItem, 'confidence_type_desc', setItem.confidence_type.description)
          result.push(setItem)
        }, [])
      }
    },
    async fetchData () {
      await this.loadReviewStates()
      await this.loadPublications()
    },
    async clearPublications () {
      this.publications = []
      this.personPublicationsCombinedMatches = []
      this.personPublicationsCombinedMatchesByReview = {}
      this.filteredPersonPublicationsCombinedMatchesByReview = {}
      this.publicationsGroupedByDoiByReview = {}
      this.publicationsGroupedByDoi = {}
      this.confidenceSetItems = []
      this.confidenceSet = undefined
    },
    async setCurrentPersonPublicationsCombinedMatches () {
      let reviewType = 'pending'
      if (this.reviewTypeFilter) {
        reviewType = this.reviewTypeFilter
      }
      this.filterPublications()
      this.personPublicationsCombinedMatches = this.filteredPersonPublicationsCombinedMatchesByReview[reviewType]

      // finally sort the publications
      await this.sortPublications()

      this.showCurrentSelectedPublication()
    },
    async loadPersonPublicationsCombinedMatches () {
      console.log(`Start group by publications ${moment().format('HH:mm:ss:SSS')}`)
      this.publicationsGroupedByReview = _.groupBy(this.publications, function (pub) {
        if (pub.reviews_aggregate.nodes && pub.reviews_aggregate.nodes.length > 0) {
          return pub.reviews_aggregate.nodes[0].reviewType
        } else {
          return 'pending'
        }
      })
      console.log(`Finish group by publications ${moment().format('HH:mm:ss:SSS')}`)

      // put in pubs grouped by doi for each review status
      _.each(this.reviewStates, (reviewType) => {
        const publications = this.publicationsGroupedByReview[reviewType]
        this.publicationsGroupedByDoiByReview[reviewType] = _.groupBy(publications, (personPub) => {
          return `${personPub.publication.doi}`
        })

        // console.log(`Person pubs grouped by DOI are: ${JSON.stringify(this.publicationsGroupedByDoiByReview, null, 2)}`)
        // grab one with highest confidence to display and grab others via doi later when changing status
        this.personPublicationsCombinedMatchesByReview[reviewType] = _.map(_.keys(this.publicationsGroupedByDoiByReview[reviewType]), (doi) => {
          // get match with highest confidence level and use that one
          const personPubs = this.publicationsGroupedByDoiByReview[reviewType][doi]
          let currentPersonPub
          _.each(personPubs, (personPub, index) => {
            if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
              currentPersonPub = personPub
            }
          })
          return currentPersonPub
        })
      })
      // initialize the list in view
      this.setCurrentPersonPublicationsCombinedMatches()
    },
    async filterPublications () {
      let filterOutCurrentPublication = false
      this.filteredPersonPublicationsCombinedMatchesByReview = _.mapValues(
        this.personPublicationsCombinedMatchesByReview,
        (personPublications) => {
          return _.filter(personPublications, (item) => {
            const includePublication = item.publication.title.toLowerCase().includes(this.pubSearch.toLowerCase().trim())
            if (!includePublication && this.personPublication && item.id === this.personPublication.id) {
              // clear out the publication from view if it is filtered out of the results
              filterOutCurrentPublication = true
            }
            return includePublication
          })
        }
      )
      if (filterOutCurrentPublication) {
        this.clearPublication()
      }
    },
    // trims off all words on front until not a stop word for sorting by first non stop word
    trimFirstArticles (title) {
      // for now just remove 'a', 'an', or 'the'
      try {
        // first trim whitespace
        let trimmedTitle = _.trim(title.toLowerCase())
        if (_.startsWith(trimmedTitle, 'the ')) {
          trimmedTitle = trimmedTitle.substring(4)
          return this.trimFirstArticles(trimmedTitle)
        } else if (_.startsWith(trimmedTitle, 'a ')) {
          trimmedTitle = trimmedTitle.substring(2)
          return this.trimFirstArticles(trimmedTitle)
        } else if (_.startsWith(trimmedTitle, 'an ')) {
          trimmedTitle = trimmedTitle.substring(3)
          return this.trimFirstArticles(trimmedTitle)
        } else {
          // call recursively above until no articles found at beginning
          return trimmedTitle
        }
      } catch (error) {
        // just return title on error
        return title
      }
    },
    getPublicationConfidence (personPublication) {
      if (personPublication.confidencesets_aggregate &&
        personPublication.confidencesets_aggregate.nodes &&
        personPublication.confidencesets_aggregate.nodes.length > 0) {
        return personPublication.confidencesets_aggregate.nodes[0].value
      } else {
        return personPublication.confidence
      }
    },
    async sortPublications () {
      // sort by confidence of pub title
      // apply any sorting applied
      console.log('sorting', this.selectedPersonPubSort)
      if (this.selectedPersonPubSort === 'Title') {
        this.personPublicationsCombinedMatches = _.sortBy(this.personPublicationsCombinedMatches, (personPub) => {
          return this.trimFirstArticles(personPub.publication.title)
        })
      } else if (this.selectedPersonPubSort === 'Source') {
        // need to sort by confidence and then name, not guaranteed to be in order from what is returned from DB
        // first group items by count
        const groupedPubs = _.groupBy(this.personPublicationsCombinedMatches, (pub) => {
          return pub.publication.source_name
        })

        // sort each person array by title for each conf
        const groupedPubsByTitle = _.mapValues(groupedPubs, (pubs) => {
          return _.sortBy(pubs, ['title'])
        })

        // get array of pub values (i.e., keys) sorted in reverse
        const sortedKeys = _.sortBy(_.keys(groupedPubsByTitle), (key) => { return key })

        // now push values into array in desc order of count and flatten
        let sortedPubs = []
        _.each(sortedKeys, (key) => {
          sortedPubs.push(groupedPubsByTitle[key])
        })

        this.personPublicationsCombinedMatches = _.flatten(sortedPubs)
      } else {
        // need to sort by confidence and then name, not guaranteed to be in order from what is returned from DB
        // first group items by count
        const pubsByConf = _.groupBy(this.personPublicationsCombinedMatches, (pub) => {
          return this.getPublicationConfidence(pub)
        })

        // sort each person array by title for each conf
        const pubsByConfByName = _.mapValues(pubsByConf, (pubs) => {
          return _.sortBy(pubs, ['title'])
        })

        // get array of confidence values (i.e., keys) sorted in reverse
        const sortedConfs = _.sortBy(_.keys(pubsByConfByName), (confidence) => { return Number.parseFloat(confidence) }).reverse()

        // now push values into array in desc order of count and flatten
        let sortedPubs = []
        _.each(sortedConfs, (key) => {
          sortedPubs.push(pubsByConfByName[key])
        })

        this.personPublicationsCombinedMatches = _.flatten(sortedPubs)
      }
    },
    async loadPublications () {
      this.startProgressBar()
      this.publicationsLoaded = false
      this.publicationsLoadedError = false
      // clear any previous publications in list
      this.clearPublications()
      // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      // this.publications = result.data.publications
      try {
        console.log(`Starting query publications ${moment().format('HH:mm:ss:SSS')}`)
        const pubsWithReviewResult = await this.$apollo.query({
          query: readPersonPublicationsAll(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max, this.userId),
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications ${moment().format('HH:mm:ss:SSS')}`)
        this.publications = pubsWithReviewResult.data.persons_publications
        this.loadPersonPublicationsCombinedMatches()
      } catch (error) {
        this.publicationsLoaded = true
        this.publicationsLoadedError = true
        throw error
      }
      this.publicationsLoaded = true
    },
    async loadPublication (personPublication) {
      this.clearPublication()
      this.personPublication = personPublication
      this.loadPublicationAuthors(personPublication)
      this.loadConfidenceSet(personPublication)
      // query separately for csl because slow to get more than one
      const publicationId = personPublication.publication.id
      const result = await this.$apollo.query({
        query: readPublication,
        variables: {
          publicationId: publicationId
        }
      })
      // const result = await this.$apollo.query(readPublication(publicationId))
      this.publication = result.data.publications[0]
      console.log(`Loaded Publication: ${JSON.stringify(this.publication)}`)
      this.publicationCitation = this.getCitationApa(this.publication.csl_string)
      try {
        const sanitizedDoi = sanitize(this.publication.doi, { replacement: '_' })
        const imageHostBase = process.env.IMAGE_HOST_URL
        const result = await this.$axios.head(`${imageHostBase}/pdfs/${sanitizedDoi}.pdf`)
        if (result.status === 200) {
          // this.results.title = result.data.title
          // this.$set(this.results, 'downloads', result.data.oa_locations[0])
          this.unpaywall = `${imageHostBase}/pdfs/${sanitizedDoi}.pdf` // result.data.oa_locations[0].url_for_pdf
          const thumbnailResult = await this.$axios.head(`${imageHostBase}/pdfs/${sanitizedDoi}.pdf`)
          if (thumbnailResult.status === 200) {
            this.unpaywallThumbnail = `${imageHostBase}/thumbnails/${sanitizedDoi}.pdf_1.png`
          } else {
            this.unpaywallThumbnail = '~/assets/Icon-pdf.svg'
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    // async refreshReviewQueue () {
    //   console.log('Refreshing review queue')
    //   this.reviewQueueKey += 1
    // },
    async addReview (index, person, personPublication, reviewType) {
      if (reviewType === this.reviewTypeFilter) {
        // If the reviewType we're adding is the same as the current filter, don't do anything
        // TODO deselect buttons that are the same as the current filter
        return null
      }
      this.person = person
      // add the review for personPublications with the same doi in the list
      const personPubs = this.publicationsGroupedByDoiByReview[this.reviewTypeFilter][personPublication.publication.doi]

      try {
        let mutateResults = []
        await _.each(personPubs, async (personPub) => {
          // const personPub = personPubs[0]
          console.log(`Adding Review for person publication: ${personPub.id}`)
          const mutateResult = await this.$apollo.mutate(
            insertReview(this.userId, personPub.id, reviewType)
          )
          console.log('&&', reviewType, this.reviewTypeFilter)
          if (mutateResult && personPub.id === personPublication.id) {
            this.$refs[`personPub${index}`].hide()
            Vue.delete(this.personPublicationsCombinedMatches, index)
            // transfer from one review queue to the next primarily for counts, other sorting will shake out on reload when clicking the tab
            // remove from current lists
            _.unset(this.publicationsGroupedByDoiByReview[this.reviewTypeFilter], personPublication.publication.doi)
            _.remove(this.personPublicationsCombinedMatchesByReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            _.remove(this.filteredPersonPublicationsCombinedMatchesByReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            // add to new lists
            this.publicationsGroupedByDoiByReview[reviewType][personPublication.publication.doi] = personPubs
            this.personPublicationsCombinedMatchesByReview[reviewType].push(personPub)
            this.filteredPersonPublicationsCombinedMatchesByReview[reviewType].push(personPub)
            if (this.reviewTypeFilter === 'pending' && this.selectedPersonTotal === 'Pending') {
              const currentPersonIndex = _.findIndex(this.people, (person) => {
                return person.id === this.person.id
              })
              this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count -= 1
            }
          }
          mutateResults.push(mutateResult)
          this.publicationsReloadPending = true
        })
        console.log(`Added reviews: ${JSON.stringify(mutateResults, null, 2)}`)
        this.clearPublication()
        return mutateResults
      } catch (error) {
        console.log(error)
      }
    },
    async clickReviewAccepted (index, person, personPublication) {
      await this.addReview(index, person, personPublication, 'accepted')
    },
    async clickReviewRejected (index, person, personPublication) {
      await this.addReview(index, person, personPublication, 'rejected')
    },
    async clickReviewUnsure (index, person, personPublication) {
      await this.addReview(index, person, personPublication, 'unsure')
    },
    getDoiUrl (doi) {
      const doiBaseUrl = 'https://dx.doi.org'
      return `${doiBaseUrl}/${doi}`
    },
    viewDOI (doi) {
      this.url = this.getDoiUrl(doi)
      this.displayUrl()
    },
    google1 () {
      const query = _.trim(`${this.person.family_name} ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${encodeURI(_.replace(query, / +/, '+'))}`
      this.displayUrl()
    },
    google2 () {
      const query = _.trim(`${this.person.family_name} Notre Dame ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${encodeURI(_.replace(query, / +/, '+'))}`
      this.displayUrl()
    },
    google3 () {
      const query = _.trim(`${this.person.family_name} nd.edu ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${encodeURI(_.replace(query, / +/, '+'))}`
      this.displayUrl()
    },
    pdf () {
      this.url = this.unpaywall
      this.displayUrl()
    },
    displayUrl () {
      this.dialog = true
    },
    clearPublication () {
      this.unpaywall = undefined
      this.personPublication = undefined
      this.publicationAuthors = []
      this.links = []
      this.url = undefined
      this.publication = undefined
      this.publicationCitation = undefined
    },
    setNameVariants (person) {
      this.nameVariants = []
      this.nameVariants[0] = `${person.family_name}, ${person.given_name.charAt(0)}`
      this.nameVariants[1] = `${person.family_name}, ${person.given_name}`
      // return variants
      _.each(person.persons_namevariances, (nameVariant) => {
        const nameStr = `${nameVariant.family_name}, ${nameVariant.given_name}`
        this.nameVariants.push(nameStr)
      })
    },
    getUpdatedPublicationYear (csl) {
      // look for both online and print dates, and make newer date win if different
      // put in array sorted by date

      let years = []
      years.push(_.get(csl, 'journal-issue.published-print.date-parts[0][0]', null))
      years.push(_.get(csl, 'journal-issue.published-online.date-parts[0][0]', null))
      years.push(_.get(csl, 'issued.date-parts[0][0]', null))
      years.push(_.get(csl, 'published-print.date-parts[0][0]', null))
      years.push(_.get(csl, 'published-online.date-parts[0][0]', null))

      years = _.sortBy(years, (year) => { return year === null ? 0 : Number.parseInt(year) }).reverse()
      if (years.length > 0 && years[0] > 0) {
        // return the most recent year
        return years[0]
      } else {
        return null
      }
    },
    // assumes getting csl as json object from DB
    getCitationApa (cslString) {
      const csl = JSON.parse(cslString)

      try {
        // update publication year to be current if can, otherwise leave as is
        const publicationYear = this.getUpdatedPublicationYear(csl)
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
      console.log(`Converted to citation: ${apaCitation}`)
      return this.decode(apaCitation)
    },
    resetFilters () {
      this.selectedPersonPubSort = this.preferredPersonPubSort
      this.selectedCenterPubSort = this.preferredCenterPubSort
      this.selectedPersonSort = this.preferredPersonSort
      this.selectedPersonTotal = this.preferredPersonTotal
      this.selectedPubYears = {
        min: this.yearPubStaticMin,
        max: this.yearPubStaticMax
      }
      this.selectedInstitutions = _.clone(this.institutionOptions)
      this.selectedMemberYears = {
        min: this.yearMemberStaticMin,
        max: this.yearMemberStaticMax
      }
    }
  },
  computed: {
    userId: sync('auth/userId'),
    isLoggedIn: sync('auth/isLoggedIn'),
    preferredPersonSort: get('filter/preferredPersonSort'),
    preferredPersonPubSort: get('filter/preferredPersonPubSort'),
    preferredCenterPubSort: get('filter/preferredCenterPubSort'),
    preferredPersonTotal: get('filter/preferredPersonTotal'),
    selectedInstitutions: sync('filter/selectedInstitutions'),
    institutionOptions: get('filter/institutionOptions'),
    selectedPersonSort: sync('filter/selectedPersonSort'),
    selectedPersonPubSort: sync('filter/selectedPersonPubSort'),
    selectedCenterPubSort: sync('filter/selectedCenterPubSort'),
    selectedPersonTotal: sync('filter/selectedPersonTotal'),
    filterReviewStates: get('filter/filterReviewStates'),
    selectedPubYears: sync('filter/selectedPubYears'),
    yearPubStaticMin: get('filter/yearPubStaticMin'),
    yearPubStaticMax: get('filter/yearPubStaticMax'),
    yearMemberStaticMin: get('filter/yearMemberStaticMin'),
    yearMemberStaticMax: get('filter/yearMemberStaticMax'),
    selectedMemberYears: sync('filter/selectedMemberYears'),
    changedPubYears: get('filter/changedPubYears'),
    changedMemberYears: get('filter/changedMemberYears'),
    pubSearch: get('filter/pubSearch')
  }
}
</script>
