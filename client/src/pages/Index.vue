<template>
  <div>
    <div class="q-pa-md">
      <!-- TODO calculate exact height below -->
      <q-splitter
        v-model="firstModel"
        unit="px"
        :style="{height: ($q.screen.height-56-16)+'px'}"
      >
        <template v-slot:before>
          <q-item-label header>Filter</q-item-label>
            <YearFilter />
            <PeopleFilter />

          <q-item-label header>People</q-item-label>
          <!-- TODO calculate exact height below -->
          <q-virtual-scroll
            :style="{'max-height': ($q.screen.height-56-16-48-72-65-60-48)+'px'}"
            :items="people"
            bordered
            separator
          >
            <template v-slot="{ item, index }">
              <q-expansion-item
                  :key="index"
                  :active="person!==undefined && item.id === person.id"
                  clickable
                  group="expansion_group_person"
                  @click="resetReviewTypeFilter();startProgressBar();loadPublications(item); setNameVariants(item)"
                  active-class="bg-teal-1 text-grey-8"
                  expand-icon="keyboard_arrow_rights"
                >
                  <template v-slot:header>
                    <q-item-section avatar top>
                      <q-avatar icon="person" color="primary" text-color="white" />
                    </q-item-section>

                    <q-item-section>
                      <q-item-label lines="1">{{ item.family_name }}, {{ item.given_name }} ({{ item.persons_publications_aggregate.aggregate.count }})</q-item-label>
                      <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
                    </q-item-section>

                    <q-item-section side>
                      <!-- <q-icon name="keyboard_arrow_right" color="green" /> -->
                    </q-item-section>
                  </template>
                  <q-card side>
                      <q-card-section>
                        <p>Institution: {{ item.institution ? item.institution.name : 'undefined'}}</p>
                        <p>Name Variants:</p>
                        <p>
                          <ul>
                            <li v-bind:key="name" v-for="name in nameVariants">{{ name }}</li>
                          </ul>
                        </p>
                        <!--<p>Common Co-authors (expandable list): {{ getCommonCoauthors(item) }}</p>-->
                      </q-card-section>
                  </q-card>
                </q-expansion-item>
            </template>
          </q-virtual-scroll>
        </template>
        <template v-slot:after v-if="person">
          <q-splitter
            v-model="secondModel"
            unit="px"
            :style="{height: ($q.screen.height-56-16)+'px'}"
          >
            <template v-slot:before>
              <q-item-label header>
                <q-input v-if="person" v-model="search" label="">
                  <template v-slot:append>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </q-item-label>
              <q-tabs
                v-model="reviewTypeFilter"
                dense
              >
                <q-tab name="pending" label="Pending" />
                <q-tab name="accepted" label="Accepted" />
                <q-tab name="rejected" label="Rejected" />
                <q-tab name="unsure" label="Unsure" />
              </q-tabs>
              <q-linear-progress
                v-if="!publicationsLoaded && !publicationsLoadedError"
                stripe
                size="10px"
                :value="progress"
                :buffer="buffer"
                :color="publicationsLoadedError ? 'red' : 'secondary'"/>
              <q-item v-if="publicationsLoadedError">
                <q-item-label>Error on Publication Data Load</q-item-label>
              </q-item>
              <q-virtual-scroll
                :items="publications"
                separator
                :style="{'max-height': ($q.screen.height-50-16-88-36-2-10-4)+'px'}"
                :ref="`pubScroll`"
              >
                <template v-slot="{ item, index }">
                  <q-expansion-item
                    :key="index"
                    clickable
                    @click="loadPublication(item);scrollToPublication(index)"
                    group="expansion_group"
                    :active="personPublication !== undefined && item.id === personPublication.id"
                    active-class="bg-teal-1 text-grey-8"
                    :ref="`personPub${index}`"
                  >
                    <template
                      v-if="item.publication !== undefined"
                      v-slot:header
                    >
                      <q-item-section avatar top>
                        <q-checkbox v-if="$store.getters['admin/isBulkEditing']" v-model="checkedPublications" :val="item.id" />
                        <q-avatar icon="description" color="primary" text-color="white" v-else />
                      </q-item-section>

                      <q-item-section>
                        <q-item-label lines="1">{{ item.publication.title }}</q-item-label>
                      </q-item-section>

                      <q-item-section side>
                        <q-badge
                          :label="item.confidence*100+'%'"
                          :color="item.confidence*100 <= 50 ? 'orange' : 'green'"
                        />
                      </q-item-section>
                    </template>
                    <q-card v-if="item.publication !== undefined">
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="clickReviewAccepted(index, person, personPublication);" />
                        <q-btn color="red" label="Reject" @click="clickReviewRejected(index, person, personPublication);" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="clickReviewUnsure(index, person, personPublication);" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </template>
              </q-virtual-scroll>
            </template>
            <template v-slot:after v-if="personPublication">
              <div
                v-if="personPublication"
                :style="{height: ($q.screen.height-50-16)+'px'}"
              >
                <div class="q-pa-md row items-start q-gutter-md">
                  <q-card>
                    <q-card-section v-if="personPublication.publication.doi">
                      <q-btn
                        dense
                        label="View via DOI"
                        color="cyan"
                        type="a"
                        :href="getDoiUrl(personPublication.publication.doi)"
                        target="_blank"
                      />
                    </q-card-section>
                    <q-card-section>
                      <q-item-label><b>Citation:</b> {{ publicationCitation }}</q-item-label>
                    </q-card-section>
                  </q-card>
                  <q-card v-if="unpaywall" class="col-xs-5" style="min-width:200px; max-height:300px" @click="pdf()">
                    <q-card-section>
                      <q-card-actions align="around">
                        <q-btn flat @click="pdf()">
                          <img
                            :src="unpaywallThumbnail"
                            style="width:180px; max-height:230px">
                        </q-btn>
                        <q-btn dense flat round color="primary" icon="link" @click="pdf()"/>
                        <q-btn dense flat round color="primary" icon="cloud_download" />
                      </q-card-actions>
                    </q-card-section>
                  </q-card>
                  <q-card :class="unpaywall ? 'col-xs-6' : 'col-xs-11'" style="min-width:200px; min-height:300px">
                    <img src="~assets/google_logo.svg" class="q-pa-md" style="max-height:100px;padding-top:20px;padding-bottom:0px;">

                    <q-item dense style="font-size:25px;padding-top:0px;padding-bottom:20px;">
                        <q-item-section align="center">
                          <q-item-label >Search</q-item-label>
                        </q-item-section>
                      </q-item>
                    <q-list>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_box" />
                        </q-item-section>

                        <q-item-section @click="google1()">
                          <q-item-label>Title + Author</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google2()">
                          <q-item-label>+ Notre Dame</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google3()">
                          <q-item-label>+ nd.edu</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>
                  <q-card class="col-xs-11">
                    <q-card-section>
                      <q-table
                        title="Possible Author Matches"
                        :data="matchedPublicationAuthors"
                        :columns="authorColumns"
                        row-key="position"
                        :rows-per-page-options="[0]"
                        :pagination.sync="pagination"
                        hide-bottom
                      />
                    </q-card-section>
                    <q-card-section>
                      <q-table
                        title="Full Author List"
                        :data="publicationAuthors"
                        :columns="authorColumns"
                        row-key="position"
                      />
                    </q-card-section>
                  </q-card>
                </div>
                <q-dialog
                  v-model="dialog"
                  persistent
                  :maximized="maximizedToggle"
                  transition-show="slide-up"
                  transition-hide="slide-down"
                >
                  <q-card class="bg-primary text-white">
                    <q-bar>
                      <q-space />

                      <q-btn dense flat icon="minimize" @click="maximizedToggle = false" :disable="!maximizedToggle">
                        <q-tooltip v-if="maximizedToggle" content-class="bg-white text-primary">Minimize</q-tooltip>
                      </q-btn>
                      <q-btn dense flat icon="crop_square" @click="maximizedToggle = true" :disable="maximizedToggle">
                        <q-tooltip v-if="!maximizedToggle" content-class="bg-white text-primary">Maximize</q-tooltip>
                      </q-btn>
                      <q-btn dense flat icon="close" v-close-popup>
                        <q-tooltip content-class="bg-white text-primary">Close</q-tooltip>
                      </q-btn>
                    </q-bar>
                    <q-card-section style="padding:0; margin:0">
                      <vue-friendly-iframe :src="url" :style="{'--height': ($q.screen.height-33)+'px'}"></vue-friendly-iframe>
                    </q-card-section>
                  </q-card>
                </q-dialog>
              </div>
            </template>
          </q-splitter>
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
import { get } from 'vuex-pathify'
import { dom, date } from 'quasar'
// const { getScrollPosition, setScrollPosition } = scroll
import readPersons from '../gql/readPersons'
// import readPersonsByInstitution from '../gql/readPersonsByInstitution'
// import readPublicationsByPerson from '../gql/readPublicationsByPerson'
// import readPublicationsByPersonByReview from '../gql/readPublicationsByPersonByReview'
import readAuthorsByPublication from '../gql/readAuthorsByPublication'
import insertReview from '../gql/insertReview'
// import readUser from '../gql/readUser'
// import readInstitutions from '../gql/readInstitutions'
import _ from 'lodash'
import Cite from 'citation-js'

import readPersonsByInstitution from '../../../gql/readPersonsByInstitution.gql'
// import readReviewStates from '../../../gql/readReviewStates.gql'
import readPendingPublications from '../../../gql/readPendingPublications.gql'
import readPublicationsByReviewState from '../../../gql/readPublicationsByReviewState.gql'
import readPublication from '../../../gql/readPublication.gql'
// import * as service from '@porter/osf.io';

import PeopleFilter from '../components/PeopleFilter.vue'
import YearFilter from '../components/YearFilter.vue'
import sanitize from 'sanitize-filename'
import moment from 'moment'

export default {
  name: 'PageIndex',
  components: {
    PeopleFilter,
    YearFilter
  },
  data: () => ({
    reviewStates: undefined,
    selectedReviewState: undefined,
    search: '',
    dom,
    date,
    firstModel: 375,
    secondModel: 400,
    people: [],
    publications: [],
    publicationsGroupedByReview: {},
    institutions: [],
    institutionOptions: [],
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
    pagination: {
      page: 1,
      rowsPerPage: 0 // 0 means all rows
    },
    reviewTypeFilter: 'pending'
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
      this.loadPersonsWithFilter()
    },
    selectedYears: function () {
      this.loadPersonsWithFilter()
      // need to see about reloading publications if in view
      this.clearPublications()
    },
    selectedPersonSort: function () {
      // re-sort people
      this.loadPersonsWithFilter()
    },
    publicationsGroupedByView: function () {
      this.loadPublications(this.person)
    },
    reviewTypeFilter: function () {
      this.startProgressBar()
      switch (this.reviewTypeFilter) {
        case 'pending':
          this.loadPublications(this.person)
          break
        default:
          this.loadPublicationsByReviewState(this.person, this.reviewTypeFilter)
          break
      }
    }
  },
  methods: {
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
    async loadPersonsWithFilter () {
      console.log('filtering', this.selectedInstitutions)
      this.people = []
      console.log(`Applying year filter to person search year min: ${this.selectedYears.min} max: ${this.selectedYears.max}`)
      const personResult = await this.$apollo.query({
        query: readPersonsByInstitution,
        variables: {
          names: this.selectedInstitutions,
          yearMin: this.selectedYears.min,
          yearMax: this.selectedYears.max
        }
      })
      this.people = personResult.data.persons

      // apply any sorting applied
      console.log('filtering', this.selectedPersonSort)
      if (this.selectedPersonSort === 'Name') {
        this.people = _.sortBy(this.people, ['family_name', 'given_name'])
      } else {
        // need to sort by total and then name, not guaranteed to be in order from what is returned from DB
        // first group items by count
        const peopleByCounts = _.groupBy(this.people, (person) => {
          return person.persons_publications_aggregate.aggregate.count
        })

        // sort each person array by name for each count
        const peopleByCountsByName = _.mapValues(peopleByCounts, (persons) => {
          return _.sortBy(persons, ['family_name', 'given_name'])
        })

        // get array of counts (i.e., keys) sorted in reverse
        const sortedCounts = _.sortBy(_.keys(peopleByCountsByName), (count) => { return Number.parseInt(count) }).reverse()

        // now push values into array in desc order of count and flatten
        let sortedPersons = []
        _.each(sortedCounts, (key) => {
          sortedPersons.push(peopleByCountsByName[key])
        })

        this.people = _.flatten(sortedPersons)
      }
    },
    // async loadReviewStates () {
    //   console.log('loading review states')
    //   const reviewStatesResult = await this.$apollo.query({
    //     query: readReviewStates
    //   })
    //   this.reviewStates = await reviewStatesResult.data.reviewstates
    //   this.showReviewStates = _.filter(this.reviewStates, (value) => { return this.showReviewState(value) })
    //   console.log(`Show Review states initialized to: ${this.showReviewStates} Review states are: ${this.reviewStates}`)
    // },
    async loadPersons () {
      const personResult = await this.$apollo.query(readPersons())
      this.people = personResult.data.persons
    },
    async loadPublicationAuthors (personPublication) {
      this.publicationAuthors = []
      const publicationId = personPublication.publication.id
      const result = await this.$apollo.query(readAuthorsByPublication(publicationId))
      this.publicationAuthors = result.data.authors_publications
      console.log(`Loaded Publication Authors: ${JSON.stringify(this.publicationAuthors)}`)
      // load up author positions of possible matches
      this.matchedPublicationAuthors = _.filter(this.publicationAuthors, function (author) {
        return _.lowerCase(author.family_name) === _.lowerCase(personPublication.person.family_name)
      })
      console.log(`Matched authors are: ${JSON.stringify(this.matchedPublicationAuthors, null, 2)}`)
    },
    async fetchData () {
      // await this.loadReviewStates()
      await this.loadPersonsWithFilter()
    },
    async clearPublications () {
      this.clearPublication()
      this.publications = []
    },
    async loadPublicationsByReviewState (person, reviewState) {
      this.publicationsLoaded = false
      this.publicationsLoadedError = false
      this.clearPublications()
      this.person = person
      try {
        const pubsWithReviewResult = await this.$apollo.query({
          query: readPublicationsByReviewState,
          variables: {
            personId: this.person.id,
            userId: this.userId,
            reviewType: reviewState,
            yearMin: this.selectedYears.min,
            yearMax: this.selectedYears.max
          },
          fetchPolicy: 'network-only'
        })
        this.publications = pubsWithReviewResult.data.persons_publications
      } catch (error) {
        this.publicationsLoaded = true
        this.publicationsLoadedError = true
        throw error
      }
      this.publicationsLoaded = true
    },
    async loadPublications (person) {
      this.publicationsLoaded = false
      this.publicationsLoadedError = false
      // clear any previous publications in list
      this.clearPublications()
      this.person = person
      // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      // this.publications = result.data.publications
      try {
        console.log(`Starting query publications for person id: ${person.id} ${moment().format('HH:mm:ss:SSS')}`)
        const pubsWithReviewResult = await this.$apollo.query({
          query: readPendingPublications,
          variables: {
            personId: this.person.id,
            userId: this.userId,
            yearMin: this.selectedYears.min,
            yearMax: this.selectedYears.max
          },
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications for person id: ${this.person.id} ${moment().format('HH:mm:ss:SSS')}`)
        this.publications = pubsWithReviewResult.data.persons_publications
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
      this.personPublication = personPublication
      try {
        const mutateResult = await this.$apollo.mutate(
          insertReview(this.userId, personPublication.id, reviewType)
        )
        console.log('&&', reviewType, this.reviewTypeFilter)
        if (mutateResult) {
          this.$refs[`personPub${index}`].hide()
          this.clearPublication()
          Vue.delete(this.publications, index)
          return mutateResult
        }
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
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
      this.displayUrl()
    },
    google2 () {
      const query = _.trim(`${this.person.family_name} Notre Dame ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
      this.displayUrl()
    },
    google3 () {
      const query = _.trim(`${this.person.family_name} nd.edu ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
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
      return apaCitation
    }
  },
  computed: {
    userId: get('auth/userId'),
    selectedInstitutions: get('filter/selectedInstitutions'),
    selectedPersonSort: get('filter/selectedPersonSort'),
    filterReviewStates: get('filter/filterReviewStates'),
    selectedYears: get('filter/selectedYears')
    // filteredPersonPublications: function (personPublications) {
    //   return personPublications.filter(item => {
    //     return _.lowerCase(item.publication.title).includes(this.search)
    //   })
    // }
  }
}
</script>
