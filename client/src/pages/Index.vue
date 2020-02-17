<template>
  <div>
    <div class="q-pa-md">
      <q-splitter
        v-model="firstModel"
        :style="{height: ($q.screen.height-50)+'px'}"
      >
        <template v-slot:before>
          <q-scroll-area
            v-if="people"
            :style="{height: ($q.screen.height-50)+'px'}"
          >
            <q-list>
              <q-item-label header>People</q-item-label>
              <!--<q-btn-dropdown
                split color="primary"
                label="Institution"
                @click="loadPersonsByInstitution(1)"
                clickable
                >
                <q-option-group class="q-pr-md"
                  v-model="institutionGroup"
                  :options="institutionOptions"
                  color="primary"
                  type="checkbox"
                  clickable
                  @click="loadPersonsByInstitution(1)"
                >
                </q-option-group>
              </q-btn-dropdown>-->
              <q-expansion-item
                v-for="item in people"
                :key="item.id"
                :active="person!==undefined && item.id === person.id"
                clickable
                v-ripple
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
            </q-list>
          </q-scroll-area>
        </template>
        <template v-slot:after>
          <q-splitter
            v-model="secondModel"
            :style="{height: ($q.screen.height-50)+'px'}"
          >
            <template v-slot:before>
              <q-scroll-area
                v-if="pendingPublications"
                ref="pendingPubsScroll"
                :style="{height: ($q.screen.height-50)/4+'px'}"
              >
                <q-list>
                  <q-item-label header>
                    <q-input v-if="person" v-model="search" label="">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </q-item-label>
                  <q-item-label header>Pending ({{ pendingPublications.length }})</q-item-label>
                  <q-expansion-item
                    v-for="item in filteredPendingPublications"
                    :key="item.id"
                    clickable
                    @click="loadPublication(item)"
                    group="expansion_group"
                    :active="personPublication !== undefined && item.id === personPublication.id"
                    active-class="bg-teal-1 text-grey-8"
                  >
                    <template v-slot:header>

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
                    <q-card>
                      <q-card-section>
                        <b>Authors</b>
                        <ol>
                          <li v-bind:key="author.id" v-for="author in publicationAuthors">{{ author.family_name }},&nbsp;{{ author.given_name}}</li>
                        </ol>
                      </q-card-section>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="reviewAccepted(person,personPublication)" />
                        <q-btn color="red" label="Reject" @click="reviewRejected(person,personPublication)" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="reviewUnsure(person,personPublication)" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-scroll-area>
              <q-scroll-area
                v-if="acceptedPublications"
                ref="acceptedPubsScroll"
                :style="{height: ($q.screen.height-50)/4+'px'}"
              >
                <q-list>
                  <q-item-label header>
                    <q-input v-if="person" v-model="search" label="">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </q-item-label>
                  <q-item-label header>Accepted ({{ acceptedPublications.length }})</q-item-label>
                  <q-expansion-item
                    v-for="item in filteredAcceptedPublications"
                    :key="item.id"
                    clickable
                    @click="loadPublication(item)"
                    group="expansion_group"
                    :active="personPublication !== undefined && item.id === personPublication.id"
                    active-class="bg-teal-1 text-grey-8"
                  >
                    <template v-slot:header>

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
                    <q-card>
                      <q-card-section>
                        <b>Authors</b>
                        <ol>
                          <li v-bind:key="author.id" v-for="author in publicationAuthors">{{ author.family_name }},&nbsp;{{ author.given_name}}</li>
                        </ol>
                      </q-card-section>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="reviewAccepted(person,personPublication)" />
                        <q-btn color="red" label="Reject" @click="reviewRejected(person,personPublication)" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="reviewUnsure(person,personPublication)" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-scroll-area>
              <q-scroll-area
                v-if="rejectedPublications"
                ref="rejectedPubsScroll"
                :style="{height: ($q.screen.height-50)/4+'px'}"
              >
                <q-list>
                  <q-item-label header>
                    <q-input v-if="person" v-model="search" label="">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </q-item-label>
                  <q-item-label header>Rejected ({{ rejectedPublications.length }})</q-item-label>
                  <q-expansion-item
                    v-for="item in filteredRejectedPublications"
                    :key="item.id"
                    clickable
                    @click="loadPublication(item)"
                    group="expansion_group"
                    :active="personPublication !== undefined && item.id === personPublication.id"
                    active-class="bg-teal-1 text-grey-8"
                  >
                    <template v-slot:header>

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
                    <q-card>
                      <q-card-section>
                        <b>Authors</b>
                        <ol>
                          <li v-bind:key="author.id" v-for="author in publicationAuthors">{{ author.family_name }},&nbsp;{{ author.given_name}}</li>
                        </ol>
                      </q-card-section>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="reviewAccepted(person,personPublication)" />
                        <q-btn color="red" label="Reject" @click="reviewRejected(person,personPublication)" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="reviewUnsure(person,personPublication)" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-scroll-area>
              <q-scroll-area
                v-if="unsurePublications"
                ref="unsurePubsScroll"
                :style="{height: ($q.screen.height-50)/4+'px'}"
              >
                <q-list>
                  <q-item-label header>
                    <q-input v-if="person" v-model="search" label="">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </q-item-label>
                  <q-item-label header>Unsure ({{ unsurePublications.length }})</q-item-label>
                  <q-expansion-item
                    v-for="item in filteredUnsurePublications"
                    :key="item.id"
                    clickable
                    @click="loadPublication(item)"
                    group="expansion_group"
                    :active="personPublication !== undefined && item.id === personPublication.id"
                    active-class="bg-teal-1 text-grey-8"
                  >
                    <template v-slot:header>

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
                    <q-card>
                      <q-card-section>
                        <b>Authors</b>
                        <ol>
                          <li v-bind:key="author.id" v-for="author in publicationAuthors">{{ author.family_name }},&nbsp;{{ author.given_name}}</li>
                        </ol>
                      </q-card-section>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="reviewAccepted(person,personPublication)" />
                        <q-btn color="red" label="Reject" @click="reviewRejected(person,personPublication)" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="reviewUnsure(person,personPublication)" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-scroll-area>
            </template>
            <template v-slot:after>
              <q-scroll-area
                v-if="personPublication"
                :style="{height: ($q.screen.height-50)+'px'}"
              >
                <div class="q-pa-lg row items-start q-gutter-md">
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
                    <img src="~/assets/Icon-pdf.svg" class="q-pa-lg">

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
import readPersons from '../gql/readPersons'
// import readPersonsByInstitution from '../gql/readPersonsByInstitution'
// import readPublicationsByPerson from '../gql/readPublicationsByPerson'
import readPublicationsByPersonByReview from '../gql/readPublicationsByPersonByReview'
import readAuthorsByPublication from '../gql/readAuthorsByPublication'
import insertReview from '../gql/insertReview'
// import readUser from '../gql/readUser'
// import readInstitutions from '../gql/readInstitutions'
import _ from 'lodash'

import readPersonsByInstitution from '../../../gql/readPersonsByInstitution.gql'
// import * as service from '@porter/osf.io';

export default {
  name: 'PageIndex',
  data: () => ({
    search: '',
    dom,
    date,
    firstModel: 33,
    secondModel: 50,
    people: [],
    pendingPublications: [],
    acceptedPublications: [],
    rejectedPublications: [],
    unsurePublications: [],
    // publications: [],
    institutions: [],
    institutionOptions: [],
    institutionGroup: [],
    personPublication: undefined,
    links: [],
    checkedPublications: [],
    url: undefined,
    unpaywall: undefined,
    dialog: false,
    maximizedToggle: true,
    person: undefined,
    user: undefined,
    username: undefined,
    institutionId: undefined,
    nameVariants: [],
    publicationAuthors: []
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async resetScrolls () {
      this.$refs.pendingPubsScroll.setScrollPosition(0)
      this.$refs.acceptedPubsScroll.setScrollPosition(0)
      this.$refs.rejectedPubsScroll.setScrollPosition(0)
      this.$refs.unsurePubsScroll.setScrollPosition(0)
    },
    async loadInstitutionDropDown () {
      // group: ['op1','op2'],
      this.institutionOptions = []
      let options = []
      let group = []
      _.forEach(this.institutions, function (institution, i) {
        if (institution) {
          group.push(`${institution.id}`)
          options.push({
            label: `${institution.name}`,
            value: `${institution.id}`
          })
        }
      })

      this.institutionOptions = options
      this.institutionGroup = group
      this.institutionGroup = ['2']
      console.log(`Institution Options are: ${JSON.stringify(this.institutionOptions)} Group is: ${JSON.stringify(this.institutionGroup)}`)
    },
    async loadPersonsByInstitution (institutionId) {
      const personResult = await this.$apollo.query({
        query: readPersonsByInstitution,
        variables: {
          institution_id: institutionId
        }
      })
      this.people = personResult.data.persons
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
      await this.loadPersonsByInstitution(1)
      // this.username = 'reviewer1'
      // const userResult = await this.$apollo.query(readUser(this.username))
      // if (userResult.data.users.length > 0) {
      //   this.user = userResult.data.users[0]
      //   console.log(`Loaded user: ${this.username}`)
      // } else {
      //   console.error(`Could not load user ${this.username}`)
      // }
      // const institutionResult = await this.$apollo.query(readInstitutions())
      // this.institutions = institutionResult.data.institutions
      // this.loadInstitutionDropDown()
      // const personResult = await this.$apollo.query(readPersonsByInstitution(1))
      // this.people = personResult.data.persons
    },
    async loadPublications (item) {
      this.resetScrolls()
      this.clearPublication()
      this.person = item
      // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      // this.publications = result.data.publications

      const pubsWithReviewResult = await this.$apollo.query(readPublicationsByPersonByReview(item.id, this.user.id))
      const pubsGroupedByReview = _.groupBy(pubsWithReviewResult.data.persons_publications, function (pub) {
        if (pub.reviews.length > 0) {
          return pub.reviews[0].reviewstate.abbrev
        } else {
          return 'pending'
        }
      })

      this.pendingPublications = pubsGroupedByReview.pending ? pubsGroupedByReview.pending : []
      this.acceptedPublications = pubsGroupedByReview.ACC ? pubsGroupedByReview.ACC : []
      this.rejectedPublications = pubsGroupedByReview.REJ ? pubsGroupedByReview.REJ : []
      this.unsurePublications = pubsGroupedByReview.UNS ? pubsGroupedByReview.UNS : []

      console.log(JSON.stringify(pubsGroupedByReview))
      console.log(`Keys are: ${_.keys(pubsGroupedByReview)}`)
    },
    async loadPublication (personPublication) {
      this.clearPublication()
      this.personPublication = personPublication
      this.loadPublicationAuthors(personPublication.publication)
      try {
        const result = await this.$axios(`https://api.unpaywall.org/v2/${personPublication.publication.doi}?email=testing@unpaywall.org`)
        if (result.status === 200) {
          // this.results.title = result.data.title
          // this.$set(this.results, 'downloads', result.data.oa_locations[0])
          this.unpaywall = result.data.oa_locations[0].url_for_pdf
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    async addReview (person, personPublication, reviewAbbrev) {
      this.clearPublication()
      this.person = person
      this.personPublication = personPublication
      try {
        console.log(person.id)
        const mutateResult = await this.$apollo.mutate(
          insertReview(this.user.id, personPublication.id, reviewAbbrev)
        )
        console.log(mutateResult)
        if (mutateResult) {
          this.reviewed()
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
    },
    reviewed () {
      this.$store.dispatch('admin/incrementLogCount')
      let index = _.findIndex(this.pendingPublications, { id: this.personPublication.id })
      if (index >= 0) {
        Vue.delete(this.pendingPublications, index)
      } else {
        index = _.findIndex(this.acceptedPublications, { id: this.personPublication.id })
        if (index >= 0) {
          Vue.delete(this.acceptedPublications, index)
        } else {
          index = _.findIndex(this.rejectedPublications, { id: this.personPublication.id })
          if (index >= 0) {
            Vue.delete(this.rejectedPublications, index)
          } else {
            index = _.findIndex(this.unsurePublications, { id: this.personPublication.id })
            if (index >= 0) {
              Vue.delete(this.unsurePublications, index)
            }
          }
        }
      }
    },
    setNameVariants (person) {
      this.nameVariants = []
      this.nameVariants[0] = `${person.family_name}, ${person.given_name.charAt(0)}`
      this.nameVariants[1] = `${person.family_name}, ${person.given_name}`
      // return variants
    }
  },
  computed: {
    userId: get('auth/userId'),
    filteredPendingPublications: () => {
      return this.pendingPublications.filter(item => {
        return _.lowerCase(item.title).includes(this.search)
      })
    },
    filteredAcceptedPublications: () => {
      return this.acceptedPublications.filter(item => {
        return _.lowerCase(item.title).includes(this.search)
      })
    },
    filteredRejectedPublications: () => {
      return this.rejectedPublications.filter(item => {
        return _.lowerCase(item.title).includes(this.search)
      })
    },
    filteredUnsurePublications: () => {
      return this.unsurePublications.filter(item => {
        return _.lowerCase(item.title).includes(this.search)
      })
    }
  }
}
</script>
