<template>
  <div>
    <div class="q-pa-md">
      <q-splitter
        v-model="firstModel"
        :style="{height: ($q.screen.height-50)+'px'}"
      >
        <template v-slot:before>
          <q-item-label header>Filter</q-item-label>
                    <YearFilter />
          <PeopleFilter />

          <q-item-label header>People</q-item-label>
          <!-- TODO calculate exact height below -->
          <q-virtual-scroll
            :style="{'max-height': ($q.screen.height-50-200)+'px'}"
            :items="people"
            separator
          >
            <template v-slot="{ item, index }">
              <q-expansion-item
                  :key="index"
                  :active="person!==undefined && item.id === person.id"
                  clickable
                  group="expansion_group_person"
                  @click="loadPublications(item); setNameVariants(item)"
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
        <template v-slot:after>
          <q-splitter
            v-model="secondModel"
            :style="{height: ($q.screen.height-50)+'px'}"
          >
            <template v-slot:before>
              <q-item-label header>
                <q-input v-if="person" v-model="search" label="">
                  <template v-slot:append>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </q-item-label>
              <q-virtual-scroll
                :items="reviewStates"
                separator
                :style="{height: ($q.screen.height-50)+'px'}"
                :key="reviewQueueKey"
              >
                <template v-slot=" {item, index} ">
                  <q-expansion-item
                    :key="index"
                    clickable
                    group="reviewed_pubs_group"
                    active-class="bg-teal-1 text-grey-8"
                    :title="item.label"
                    @click="setSelectedReviewState(item.abbrev)">
                    <template v-slot:header>
                      <q-item-section>
                        <q-item-label lines="1">{{ item.name}} ({{ (publicationsGroupedByReview[item.abbrev] ? publicationsGroupedByReview[item.abbrev].length : 0) }})</q-item-label>
                      </q-item-section>
                    </template>
                    <q-virtual-scroll
                      separator
                      :style="{height: ($q.screen.height-200)+'px'}"
                      :items="publicationsGroupedByReview[item.abbrev] === undefined ? []: publicationsGroupedByReview[item.abbrev]"
                      :ref="item.abbrev"
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
                            <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
                         </q-item-section>

                          <q-item-section side>
                            <q-badge
                              :label="item.confidence*100+'%'"
                              :color="item.confidence*100 <= 50 ? 'orange' : 'green'"
                            />
                         </q-item-section>

                          <!-- <q-item-section side>
                            <q-icon name="keyboard_arrow_right" color="green" />
                          </q-item-section> -->
                        </template>
                        <q-card v-if="item.publication !== undefined">
                          <q-card-section class="text-center">
                           <q-btn color="green" label="Accept" class="on-left" @click="$refs[`personPub${index}`].hide();reviewAccepted(person,personPublication);" />
                            <q-btn color="red" label="Reject" @click="$refs[`personPub${index}`].hide();reviewRejected(person,personPublication);" />
                            <q-btn color="grey" label="Unsure" class="on-right" @click="$refs[`personPub${index}`].hide();reviewUnsure(person,personPublication);" />
                          </q-card-section>
                        </q-card>
                     </q-expansion-item>
                    </template>
                    </q-virtual-scroll>
                  </q-expansion-item>
                </template>
              </q-virtual-scroll>
            </template>
            <template v-slot:after>
              <q-scroll-area
                v-if="personPublication"
                :style="{height: ($q.screen.height-50)+'px'}"
              >

                <div class="q-pa-lg row items-start q-gutter-md">
                  <q-card>
                <q-card-section>
                  <q-item-label><b>Citation:</b> {{ publicationCitation }}</q-item-label>
                </q-card-section>
              </q-card>
                  <q-card class="my-card col-xs-4" style="width:200px; min-height:300px">
                    <img src="~assets/google_logo.svg" class="q-pa-md" style="padding-top:50px;">

                    <q-list>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_box" />
                        </q-item-section>

                        <q-item-section @click="google1()">
                          <q-item-label>Title + Author</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google2()">
                          <q-item-label>+ Notre Dame</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google3()">
                          <q-item-label>+ nd.edu</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>

                  <q-card class="my-card col-xs-4" style="width:200px; min-height:300px" v-if="unpaywall">
                    <img :src="unpaywallThumbnail" class="q-pa-lg">

                    <q-card-actions align="around">
                      <q-btn flat round color="primary" icon="link" @click="pdf()"/>
                      <q-btn flat round color="primary" icon="cloud_download" />
                    </q-card-actions>
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
              </q-scroll-area>
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
import readPublicationsByPersonByReview from '../gql/readPublicationsByPersonByReview'
import readAuthorsByPublication from '../gql/readAuthorsByPublication'
import insertReview from '../gql/insertReview'
// import readUser from '../gql/readUser'
// import readInstitutions from '../gql/readInstitutions'
import _ from 'lodash'
import Cite from 'citation-js'

import readPersonsByInstitution from '../../../gql/readPersonsByInstitution.gql'
import readReviewStates from '../../../gql/readReviewStates.gql'
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
    firstModel: 33,
    secondModel: 50,
    people: [],
    publicationsGroupedByReview: {},
    institutions: [],
    institutionOptions: [],
    institutionGroup: [],
    personPublication: undefined,
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
    reviewQueueKey: 0,
    publicationCitation: undefined
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData',
    selectedInstitutions: function () {
      this.loadPersonsWithFilter()
    },
    publicationsGroupedByView: function () {
      this.loadPublications(this.person)
    }
  },
  methods: {
    async setSelectedReviewState (reviewAbbrev) {
      this.selectedReviewState = reviewAbbrev
    },
    async scrollToPublication (index) {
      console.log(`updating scroll ${index} for ${this.selectedReviewState} ${this.$refs[this.selectedReviewState].toString}`)
      this.$refs[this.selectedReviewState].scrollTo(index)
      // console.log(`scroll position is ${scrollPosition}`)
      // setScrollPosition(this.$refs.pubScrollArea, scrollPosition + offset)
    },
    async resetScrolls () {
      // this.$refs.pendingPubsScroll.setScrollPosition(0)
      // this.$refs.acceptedPubsScroll.setScrollPosition(0)
      // this.$refs.rejectedPubsScroll.setScrollPosition(0)
      // this.$refs.unsurePubsScroll.setScrollPosition(0)
    },
    async loadPersonsWithFilter () {
      console.log('filtering', this.selectedInstitutions)
      this.people = []
      const personResult = await this.$apollo.query({
        query: readPersonsByInstitution,
        variables: {
          names: this.selectedInstitutions
        }
      })
      this.people = personResult.data.persons
    },
    async loadReviewStates () {
      console.log('loading review states')
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewStates
      })
      this.reviewStates = reviewStatesResult.data.reviewstates
    },
    async loadPersons () {
      const personResult = await this.$apollo.query(readPersons())
      this.people = personResult.data.persons
    },
    async loadPublicationAuthors (item) {
      this.publicationAuthors = []
      const result = await this.$apollo.query(readAuthorsByPublication(item.id))
      this.publicationAuthors = result.data.authors_publications
      console.log(`Loaded Publication Authors: ${JSON.stringify(this.publicationAuthors)}`)
    },
    async fetchData () {
      await this.loadReviewStates()
      await this.loadPersonsWithFilter()
    },
    async loadPublications (item) {
      this.resetScrolls()
      this.clearPublication()
      this.person = item
      // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      // this.publications = result.data.publications
      console.log(item.id)
      console.log(`Starting query publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
      const pubsWithReviewResult = await this.$apollo.query(readPublicationsByPersonByReview(item.id, this.userId))
      console.log('***', pubsWithReviewResult)
      console.log(`Finished query publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
      console.log(`Starting group by publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
      this.publicationsGroupedByReview = _.groupBy(pubsWithReviewResult.data.persons_publications, function (pub) {
        if (pub.reviews.length > 0) {
          return pub.reviews[0].reviewstate.abbrev
        } else {
          return 'PEN'
        }
      })
      console.log(`Finished group by publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
      console.log(`Starting add empty arrays publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
      // add empty arrays to initialize empty list
      if (this.publicationsGroupedByReview['ACC'] === undefined) this.publicationsGroupedByReview['ACC'] = []
      if (this.publicationsGroupedByReview['PEN'] === undefined) this.publicationsGroupedByReview['PEN'] = []
      if (this.publicationsGroupedByReview['REJ'] === undefined) this.publicationsGroupedByReview['REJ'] = []
      if (this.publicationsGroupedByReview['UNS'] === undefined) this.publicationsGroupedByReview['UNS'] = []
      console.log(`Finished add empty arrays publications for person id: ${item.id} ${moment().format('HH:mm:ss:SSS')}`)
    },
    async loadPublication (personPublication) {
      this.clearPublication()
      this.personPublication = personPublication
      this.loadPublicationAuthors(personPublication.publication)
      this.publicationCitation = this.getCitationApa(personPublication.publication.csl)
      try {
        const sanitizedDoi = sanitize(personPublication.publication.doi, { replacement: '_' })
        const imageHostBase = process.env.IMAGE_HOST_URL
        const result = await this.$axios.head(`http://${imageHostBase}/pdfs/${sanitizedDoi}.pdf`)
        if (result.status === 200) {
          // this.results.title = result.data.title
          // this.$set(this.results, 'downloads', result.data.oa_locations[0])
          this.unpaywall = `http://${imageHostBase}/pdfs/${sanitizedDoi}.pdf` // result.data.oa_locations[0].url_for_pdf
          const thumbnailResult = await this.$axios.head(`http://${imageHostBase}/pdfs/${sanitizedDoi}.pdf`)
          if (thumbnailResult.status === 200) {
            this.unpaywallThumbnail = `http://${imageHostBase}/thumbnails/${sanitizedDoi}.pdf_1.png`
          } else {
            this.unpaywallThumbnail = '~/assets/Icon-pdf.svg'
          }
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    async refreshReviewQueue () {
      this.reviewQueueKey += 1
    },
    async addReview (person, personPublication, reviewAbbrev) {
      this.person = person
      this.personPublication = personPublication
      try {
        console.log(person.id)
        const mutateResult = await this.$apollo.mutate(
          insertReview(this.userId, personPublication.id, reviewAbbrev)
        )
        console.log(mutateResult)
        if (mutateResult) {
          this.reviewed(reviewAbbrev)
          this.refreshReviewQueue()
          return mutateResult
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    async reviewAccepted (person, personPublication) {
      const mutateResult = this.addReview(person, personPublication, 'ACC')
      if (mutateResult) {
        console.log(`Incrementing accepted count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementAcceptedCount')
        console.log(`Accepted count is: ${this.$store.getters['admin/acceptedCount']}`)
      }
    },
    async reviewRejected (person, personPublication) {
      const mutateResult = this.addReview(person, personPublication, 'REJ')
      if (mutateResult) {
        console.log(`Incrementing rejected count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementRejectedCount')
        console.log(`Rejected count is: ${this.$store.getters['admin/rejectedCount']}`)
      }
    },
    async reviewUnsure (person, personPublication) {
      const mutateResult = this.addReview(person, personPublication, 'UNS')
      if (mutateResult) {
        console.log(`Incrementing unsure count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementUnsureCount')
        console.log(`Unsure count is: ${this.$store.getters['admin/unsureCount']}`)
      }
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
      this.publicationCitation = undefined
    },
    reviewed (reviewAbbrev) {
      this.$store.dispatch('admin/incrementLogCount')
      let index = _.findIndex(this.publicationsGroupedByReview['PEN'], { id: this.personPublication.id })
      // remove item from current review state list
      if (index >= 0) {
        Vue.delete(this.publicationsGroupedByReview['PEN'], index)
      } else {
        index = _.findIndex(this.publicationsGroupedByReview['ACC'], { id: this.personPublication.id })
        if (index >= 0) {
          Vue.delete(this.publicationsGroupedByReview['ACC'], index)
        } else {
          index = _.findIndex(this.publicationsGroupedByReview['REJ'], { id: this.personPublication.id })
          if (index >= 0) {
            Vue.delete(this.publicationsGroupedByReview['REJ'], index)
          } else {
            index = _.findIndex(this.publicationsGroupedByReview['UNS'], { id: this.personPublication.id })
            if (index >= 0) {
              Vue.delete(this.publicationsGroupedByReview['UNS'], index)
            }
          }
        }
      }
      // add item into new review state list
      Vue.set(this.publicationsGroupedByReview[reviewAbbrev], this.publicationsGroupedByReview[reviewAbbrev].length, this.personPublication)
    },
    setNameVariants (person) {
      this.nameVariants = []
      this.nameVariants[0] = `${person.family_name}, ${person.given_name.charAt(0)}`
      this.nameVariants[1] = `${person.family_name}, ${person.given_name}`
      // return variants
    },
    // assumes getting csl as json object from DB
    getCitationApa (csl) {
      // const csl = JSON.parse(cslString)
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
    selectedInstitutions: get('filter/selectedInstitutions')
    // filteredPersonPublications: function (personPublications) {
    //   return personPublications.filter(item => {
    //     return _.lowerCase(item.publication.title).includes(this.search)
    //   })
    // }
  }
}
</script>
