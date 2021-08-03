<template>
  <div>
    <div class="q-pa-md">
      <!-- TODO calculate exact height below -->
        <!--div class="page-sidebar"-->
        <div class="q-pa-md row" style="width:100%">
          <div>
            <q-item-label class="text-h6" header>Notre Dame Author Review ({{ (people ? people.length : 0) }} Authors Shown)                  </q-item-label>
          </div>
          <div>
            <q-item>
              <q-select
                v-model="selectedCenter"
                :options="centerOptions"
                class="white"
                label="Review For:"
                v-if="isLoggedIn"
                map-options
              />
            </q-item>
          </div>
        </div>
        <MainAuthorReviewFilter />
        <!--/div-->
      <!-- Site Content -->
      <!--<div id="content" class="site-content">
        <div class="page-header"></div>
        <main class="page-main" role="main">
          <ol class="breadcrumbs">
            <li><a href="/">Home</a> › </li>
            <li><a href="#">Parent</a> › </li>
            <li>Page Title</li>
          </ol>
          <h1 class="page-title">Notre Dame Author Review</h1>
          <div class="grid grid-md-3">
            <div class="page-primary span-md-2">-->
              <!-- Page Content -->
              <q-splitter
                v-model="firstModel"
                unit="px"
                :style="{height: ($q.screen.height-56-16-2)+'px'}"
              >
                <template v-slot:before>
                  <!-- TODO calculate exact height below -->
                  <q-linear-progress
                v-if="!personsLoaded && !personsLoadedError"
                stripe
                size="10px"
                :value="progress"
                :buffer="buffer"
                :color="personsLoadedError ? 'red' : 'secondary'"/>
              <q-item v-if="personsLoadedError">
                <q-item-label>Error on Person Data Load</q-item-label>
              </q-item>
                  <q-virtual-scroll
                    :style="{'max-height': ($q.screen.height-74)+'px'}"
                    :items="people"
                    bordered
                    separator
                    :visible="visibleScroll"
                    :key="peopleScrollKey"
                    :ref="`personScroll`"
                  >
                    <template v-slot="{ item, index }">
                      <q-expansion-item
                          :key="index"
                          :active="person!==undefined && item.id === person.id"
                          clickable
                          group="expansion_group_person"
                          @click="resetReviewTypeFilter();startProgressBar();clearPublication();clearPublications();loadPublications(item); setNameVariants(item)"
                          active-class="bg-teal-1 text-grey-8"
                          expand-icon="keyboard_arrow_rights"
                          :ref="`person${index}`"
                        >
                          <template v-slot:header>
                            <q-item-section avatar top>
                              <q-avatar icon="person" color="primary" text-color="white" />
                            </q-item-section>

                            <q-item-section>
                              <q-item-label lines="1">{{ item.family_name }}, {{ item.given_name }} ({{ item.person_publication_count }})</q-item-label>
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
                      <PublicationFilter />
                      <q-tabs
                        v-model="reviewTypeFilter"
                        dense
                      >
                        <q-tab name="pending" :label="`Pending (${getPublicationsGroupedByTitleByReviewCount('pending')})`" />
                        <q-tab name="accepted" :label="`Accepted (${getPublicationsGroupedByTitleByReviewCount('accepted')})`" />
                        <q-tab name="rejected" :label="`Rejected (${getPublicationsGroupedByTitleByReviewCount('rejected')})`" />
                        <q-tab name="unsure" :label="`Unsure (${getPublicationsGroupedByTitleByReviewCount('unsure')})`" />
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
                        :items="personPublicationsCombinedMatches"
                        separator
                        bordered
                        :style="{'max-height': ($q.screen.height-50-88-36-8)+'px'}"
                        :ref="`pubScroll`"
                      >
                        <template v-slot="{ item, index }">
                          <q-expansion-item
                            :key="item.id"
                            clickable
                            @click="loadPublication(item);scrollToPublication(index)"
                            group="expansion_group"
                            :active="personPublication !== undefined && item.id === personPublication.id"
                            active-class="bg-teal-1 text-grey-8"
                            :ref="`personPub${index}`"
                            :header-inset-level="0"
                            :content-inset-level="0"
                          >
                            <template
                              v-if="item.publication !== undefined"
                              v-slot:header
                            >
                              <q-item-section avatar>
                                <q-checkbox v-if="$store.getters['admin/isBulkEditing']" v-model="checkedPublications" :val="item.id" />
                                <q-avatar icon="description" color="primary" text-color="white" v-else />
                              </q-item-section>
                              <q-item-section top class="q-pa-xs">
                                <q-item-label style="width:100%" class="text-grey-9" lines="1"><strong>Title:</strong> {{ decode(item.publication.title) }}</q-item-label>
                                <q-list class="q-pt-sm">
                                  <q-btn
                                    @click.capture.stop
                                    rounded
                                    dense
                                    size="sm"
                                    v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(publicationsGroupedByTitleByReview[reviewTypeFilter][item.publication.title])"
                                    :key="index"
                                    :color="getSourceNameChipColor(personPub.publication.source_name)"
                                    text-color="white"
                                    type="a"
                                    :href="getSourceUri(personPub)"
                                    target="_blank"
                                    :label="getDisplaySourceLabel(personPub)"
                                  />
                                </q-list>
                              </q-item-section>
                              <q-item-section avatar side>
                                <q-badge
                                  :label="getPublicationConfidence(item)*100+'%'"
                                  :color="getPublicationConfidence(item)*100 < 50 ? 'amber-10' : 'green'"
                                />
                              </q-item-section>
                            </template>
                            <q-card v-if="item.publication !== undefined">
                              <q-card-section dense class="text-center">
                                <q-item-label align="left">Move To:</q-item-label>
                                <q-btn dense v-if="reviewTypeFilter!=='pending'" color="purple" label="Pending" class="on-left" @click="clickReviewPending(index, person, personPublication);" />
                                <q-btn dense v-if="reviewTypeFilter!=='accepted'" color="blue" label="Accepted" class="on-left" @click="clickReviewAccepted(index, person, personPublication);" />
                                <q-btn dense v-if="reviewTypeFilter!=='rejected'" color="red" label="Rejected" class="on-left" @click="clickReviewRejected(index, person, personPublication);" />
                                <q-btn dense v-if="reviewTypeFilter!=='unsure'" color="grey" label="Unsure" class="on-left" @click="clickReviewUnsure(index, person, personPublication);" />
                              </q-card-section>
                            </q-card>
                          </q-expansion-item>
                        </template>
                      </q-virtual-scroll>
                    </template>
                    <template v-slot:after v-if="personPublication">
                      <div
                        v-if="personPublication"
                        :style="{height: ($q.screen.height-56-16)+'px'}"
                      >
                        <div class="q-pa-md row items-start q-gutter-md">
                          <q-card>
                            <q-card-section>
                              <q-item-label align="left"><strong>View Article:</strong></q-item-label>
                              <q-list class="q-pt-sm q-pb-sm">
                                <q-btn
                                  rounded
                                  dense
                                  no-wrap
                                  size="md"
                                  v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(publicationsGroupedByTitleByReview[reviewTypeFilter][personPublication.publication.title])"
                                  :key="index"
                                  :color="getSourceNameChipColor(personPub.publication.source_name)"
                                  text-color="white"
                                  type="a"
                                  :href="getSourceUri(personPub)"
                                  target="_blank"
                                  :label="getDisplaySourceLabel(personPub)"
                                />
                              </q-list>
                              <q-btn
                                v-if="personPublication && personPublication.publication.doi"
                                dense
                                label="View via DOI"
                                color="cyan"
                                type="a"
                                :href="getDoiUrl(personPublication.publication.doi)"
                                target="_blank"
                              />
                            </q-card-section>
                            <q-card-section v-if="publication.title" class="text-left">
                              <q-item-label><b>Title:&nbsp;</b>{{ publication.title }}</q-item-label>
                            </q-card-section>
                            <q-card-section>
                              <q-item-label><b>Citation:</b> {{ publicationCitation }}</q-item-label>
                            </q-card-section>
                            <q-card-section v-if="publication.journal_title" class="text-left">
                              <q-item-label><b>Journal Title:&nbsp;</b>{{ publication.journal_title }}</q-item-label>
                            </q-card-section>
                            <q-card-section v-if="publication.journal" class="text-left">
                              <q-item-label><b>Journal Subjects:</b></q-item-label>
                              <q-item-label :key="index" v-for="(classification, index) in publicationJournalClassifications" lines="1">{{classification.name}}</q-item-label>
                            </q-card-section>
                            <q-card-section v-if="personPublication.publication.abstract && personPublication.publication.abstract.length > 0" dense class="text-left">
                              <q-item-label><b>Abstract:</b></q-item-label>
                              <q-item>{{personPublication.publication.abstract}}</q-item>
                            </q-card-section>
                            <q-card-section v-else dense class="text-left">
                              <q-item-label><b>Abstract:</b> Unavailable</q-item-label>
                            </q-card-section>
                          </q-card>
                          <q-card v-if="unpaywall" class="col-xs-5" style="min-width:200px; max-height:300px" @click="pdf()">
                              <q-card style="min-width:200px" class="justify-center">
                                <q-card-actions align="around">
                                  <q-btn flat @click="pdf()">
                                    <img
                                      :src="unpaywallThumbnail"
                                      style="align:center;width:190px; max-height:230px">
                                  </q-btn>
                                </q-card-actions>
                              </q-card>
                              <q-card style="min-width:200px">
                                <q-card-actions align="around">
                                  <q-btn dense flat round color="primary" icon="link" @click="pdf()"/>
                                  <q-btn dense flat round color="primary" icon="cloud_download" />
                                </q-card-actions>
                              </q-card>
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
                                dense
                                title="Confidence Breakdown"
                                :data="confidenceSetItems"
                                :columns="confidenceColumns"
                                row-key="id"
                              >
                                <q-tr slot="bottom-row">
                                  <q-td colspan="100%">
                                    <strong>Total: {{ confidenceSet.value }}</strong>
                                  </q-td>
                                </q-tr>
                              </q-table>
                            </q-card-section>
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
        <!--</main>
      </div>
    </div>
  </div>-->
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

// import readPersonsByInstitutionByYear from '../gql/readPersonsByInstitutionByYear'
import readPersonsByInstitutionByYearAllCenters from '../gql/readPersonsByInstitutionByYearAllCenters'
import readPersonsByInstitutionByYearByOrganization from '../gql/readPersonsByInstitutionByYearByOrganization'
// import readPersonsByInstitutionByYearPendingPubs from '../gql/readPersonsByInstitutionByYearPendingPubs'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import readPublications from '../gql/readPublications'
// import readPendingPublications from '../../../gql/readPendingPublications.gql'
import readPersonPublications from '../../../gql/readPersonPublications.gql'
// import readPublicationsByReviewState from '../../../gql/readPublicationsByReviewState.gql'
import readPublication from '../../../gql/readPublication.gql'
// import * as service from '@porter/osf.io';
import readOrganizations from '../../../gql/readOrganizations.gql'
import PublicationFilter from '../components/PublicationFilter.vue'
import MainAuthorReviewFilter from '../components/MainAuthorReviewFilter.vue'
import sanitize from 'sanitize-filename'
import moment from 'moment'

export default {
  name: 'PageIndex',
  components: {
    PublicationFilter,
    MainAuthorReviewFilter
  },
  data: () => ({
    personLoadCount: 0,
    reviewStates: undefined,
    selectedReviewState: undefined,
    personScrollIndex: 0,
    dom,
    date,
    firstModel: 375,
    secondModel: 500,
    people: [],
    publications: [],
    personsLoaded: false,
    personsLoadedError: false,
    publicationsGroupedByReview: {},
    personPublicationsCombinedMatches: [],
    personReviewedPubCounts: {},
    personPublicationsCombinedMatchesByReview: {},
    filteredPersonPublicationsCombinedMatchesByReview: {},
    publicationsGroupedByTitleByReview: {},
    publicationJournalClassifications: [],
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
    // fundersByDoi: {},
    // for progress bar
    progress: 0,
    buffer: 0,
    publicationsLoaded: false,
    publicationsLoadedError: false,
    showPersonProgressBar: false,
    showProgressBar: false,
    visibleScroll: true,
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
    miniState: false,
    peopleScrollKey: 0
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
    selectedCenter: function () {
      this.loadPersonsWithFilter()
    },
    changedPubYears: async function () {
      await this.loadPersonsWithFilter()
      if (this.person) {
        // reload publications if person selected
        await this.loadPublications(this.person)
      }
    },
    changedMemberYears: async function () {
      await this.loadPersonsWithFilter()
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
    selectedPersonConfidence: function () {
      this.loadPersonsWithFilter()
    },
    publicationsGroupedByView: function () {
      this.loadPublications(this.person)
    },
    reviewTypeFilter: function () {
      if (this.publicationsReloadPending) {
        this.loadPublications(this.person)
        this.publicationsReloadPending = false
      } else {
        this.setCurrentPersonPublicationsCombinedMatches()
      }
    }
  },
  methods: {
    getPublicationDoiKey (publication) {
      if (!publication.doi) {
        return `${publication.source_name}_${publication.source_id}`
      } else {
        return publication.doi
      }
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
    changedPendingCounts: function (personIndex) {
      // this.personSortKey += 1
      // this.peopleScrollKey += 1
      // this.$refs['personScroll'].refresh()
      // this.showCurrentSelectedPerson()
    },
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
      } else if (personPublication.publication.source_name.toLowerCase() === 'semanticscholar' &&
        personPublication.publication.semantic_scholar_id) {
        return personPublication.publication.semantic_scholar_id
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
      } else if (personPublication.publication.source_name.toLowerCase() === 'webofscience') {
        return personPublication.publication.wos_id['_text']
      } else {
        return undefined
      }
    },
    // sort person pubs by source so chips in screen always in same order
    getSortedPersonPublicationsBySourceName (personPublications) {
      const sortedPubs = _.sortBy(personPublications, (personPublication) => {
        return personPublication.publication.source_name
      })
      return _.uniqBy(sortedPubs, (personPub) => {
        return personPub.publication.source_name
      })
    },
    getDisplaySourceLabel (personPublication) {
      const sourceId = this.getPublicationSourceId(personPublication)
      let sourceName = personPublication.publication.source_name
      let display = sourceName
      if (sourceId) {
        display = `${sourceName}: ${sourceId}`
      }
      // truncate display if needed
      return `${_.truncate(display, 16)}`
    },
    // depending on the source return source uri
    getSourceUri (personPublication) {
      console.log(`Getting source uri for personPublication pub`)
      console.log(`Process env wos url: ${process.env.WOS_PUBLICATION_URL}`)
      const sourceId = this.getPublicationSourceId(personPublication)
      if (sourceId) {
        if (personPublication.publication.source_name.toLowerCase() === 'scopus') {
          return this.getScopusUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'pubmed') {
          return this.getPubMedUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'crossref') {
          return this.getDoiUrl(personPublication.publication.doi)
        } else if (personPublication.publication.source_name.toLowerCase() === 'webofscience') {
          return this.getWebOfScienceUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'semanticscholar') {
          console.log(`got semantic scholar paper uri ${this.getSemanticScholarUri(sourceId)}`)
          return this.getSemanticScholarUri(sourceId)
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
    getSemanticScholarUri (paperId) {
      return `${process.env.SEMANTIC_SCHOLAR_VIEW_PUBLICATION_URL}${paperId}`
    },
    getWebOfScienceUri (wosId) {
      return `${process.env.WOS_PUBLICATION_URL}${wosId}`
    },
    getPublicationsGroupedByTitleByReviewCount (reviewType) {
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
        } else if (sourceName.toLowerCase() === 'webofscience') {
          return 'teal'
        } else {
          return 'indigo'
        }
      } else {
        return 'indigo'
      }
    },
    // return all duplicate publications
    async reportDuplicatePublications () {
      const pubResults = await this.$apollo.query(readPublications())
      const publications = _.map(pubResults.data.publications, (pub) => {
        _.set(pub, 'doi', _.toLower(pub.doi))
        return pub
      })
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
    async startPersonProgressBar () {
      this.personsLoaded = false
      this.personsLoadedError = false
      this.resetPersonProgressBar()
      await this.runPersonProgressBar()
    },
    async resetPersonProgressBar () {
      this.buffer = 0
      this.progress = 0
      this.showPersonProgressBar = true
      clearInterval(this.interval)
      clearInterval(this.bufferInterval)
    },
    async runPersonProgressBar () {
      this.interval = setInterval(() => {
        if (this.personsLoaded && this.progress > 0) {
          if (this.progress === 1) {
            // set show progress bar to false the second time called so bar completes before hiding
            this.showPersonProgressBar = false
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

    getPersonPublicationCount (person, minConfidence) {
      let includeCount = 0
      _.each(person.confidencesets_persons_publications_aggregate.nodes, (node) => {
        if (node.value >= 0.50) {
          includeCount += 1
        }
      })
      if (this.selectedPersonTotal === 'All') {
        return includeCount
      } else {
        let pendingCount = includeCount - this.personReviewedPubCounts[person.id]
        return (pendingCount >= 0 ? pendingCount : 0)
      }
    },
    async loadPersonsWithFilter () {
      const currentLoadCount = this.personLoadCount + 1
      this.personLoadCount += 1
      this.clearPublication()
      this.clearPublications()
      this.startPersonProgressBar()
      this.personsLoaded = false
      this.personsLoadedError = false
      console.log('filtering', this.selectedInstitutions)
      this.people = []
      // console.log(`Applying year filter to person search year min: ${this.selectedPubYears.min} max: ${this.selectedPubYears.max}`)
      let minConfidence = 0
      if (this.selectedPersonConfidence === '50%') minConfidence = 0.5
      if (!this.selectedCenter || !this.selectedCenter.value || this.selectedCenter.value === 'ND') {
        const personResult = await this.$apollo.query(readPersonsByInstitutionByYearAllCenters(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max, minConfidence), { fetchPolicy: 'network-only' })
        if (currentLoadCount === this.personLoadCount) {
          this.people = personResult.data.persons
        }
      } else {
        console.log(`Getting people for ${this.selectedCenter.value}`)
        const personResult = await this.$apollo.query(readPersonsByInstitutionByYearByOrganization(this.selectedCenter.value, this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max, minConfidence), { fetchPolicy: 'network-only' })
        if (currentLoadCount === this.personLoadCount) {
          this.people = personResult.data.persons
        }
      }

      if (currentLoadCount === this.personLoadCount) {
        // calculate the total count to show
        this.personReviewedPubCounts = {}
        console.log('Checking for reviewed pub counts...')
        _.each(this.people, (person) => {
          const reviewedTitles = {}
          _.each(person.reviews_persons_publications, (review) => {
            if (review.review_type && review.review_type !== 'pending') {
              reviewedTitles[review.title] = review
            }
          })

          // check for dois that are in the confidence set list and keep those, all others ignore
          let filteredReviewedTitlesCount = 0
          _.each(person.confidencesets_persons_publications, (confidenceSet) => {
            const title = confidenceSet.title
            if (reviewedTitles[title]) {
              filteredReviewedTitlesCount += 1
            }
          })

          this.personReviewedPubCounts[person.id] = filteredReviewedTitlesCount
        })

        // console.log(`Reviewed counts are: ${JSON.stringify(this.personReviewedPubCounts, null, 2)}`)

        // set the pub counts for person
        this.people = _.map(this.people, (person) => {
          return _.set(person, 'person_publication_count', this.getPersonPublicationCount(person, minConfidence))
        })

        // apply any sorting applied
        console.log('filtering', this.selectedPersonSort)
        if (this.selectedPersonSort === 'Name') {
          this.people = await _.sortBy(this.people, ['family_name', 'given_name'])
        } else {
          // need to sort by total and then name, not guaranteed to be in order from what is returned from DB
          // first group items by count
          const peopleByCounts = await _.groupBy(this.people, (person) => {
            return person.person_publication_count
          })

          console.log(`People by counts are: ${JSON.stringify(peopleByCounts, null, 2)}`)

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
        this.personsLoaded = true
      } else {
        console.log('Another load of person detected before this process finished, aborting process.')
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
      const results = await this.$apollo.query({
        query: readOrganizations
      })

      this.centerOptions = _.map(results.data.review_organization, (reviewOrg) => {
        return {
          label: reviewOrg.comment,
          value: reviewOrg.value
        }
      })

      if (!this.selectedCenter) {
        this.selectedCenter = this.preferredSelectedCenter
      }
      await this.loadReviewStates()
      await this.loadPersonsWithFilter()
    },
    async clearPublications () {
      this.publications = []
      this.personPublicationsCombinedMatches = []
      this.personPublicationsCombinedMatchesByReview = {}
      this.filteredPersonPublicationsCombinedMatchesByReview = {}
      this.publicationsGroupedByTitleByReview = {}
      this.publicationsGroupedByTitle = {}
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
      // this.fundersByDoi = {}
      console.log(`Start group by publications for person id: ${this.person.id} ${moment().format('HH:mm:ss:SSS')}`)
      this.publicationsGroupedByReview = _.groupBy(this.publications, function (pub) {
        if (pub.reviews_aggregate.nodes && pub.reviews_aggregate.nodes.length > 0) {
          return pub.reviews_aggregate.nodes[0].review_type
        } else {
          return 'pending'
        }
      })
      console.log(`Finish group by publications for person id: ${this.person.id} ${moment().format('HH:mm:ss:SSS')}`)

      // check for any doi's with reviews out of sync,
      // if more than one review type found add doi mapped to array of reviewtype to array pub list
      let publicationTitlesByReviewType = {}
      // put in pubs grouped by doi for each review status
      _.each(this.reviewStates, (reviewType) => {
        const publications = this.publicationsGroupedByReview[reviewType]
        this.publicationsGroupedByTitleByReview[reviewType] = _.groupBy(publications, (personPub) => {
          let title = personPub.publication.title
          if (!publicationTitlesByReviewType[title]) {
            publicationTitlesByReviewType[title] = {}
          }
          if (!publicationTitlesByReviewType[title][reviewType]) {
            publicationTitlesByReviewType[title][reviewType] = []
          }
          publicationTitlesByReviewType[title][reviewType].push(personPub)
          return `${title}`
        })

        // console.log(`Person pubs grouped by Title are: ${JSON.stringify(this.publicationsGroupedByTitleByReview, null, 2)}`)
        // grab one with highest confidence to display and grab others via title later when changing status
        this.personPublicationsCombinedMatchesByReview[reviewType] = _.map(_.keys(this.publicationsGroupedByTitleByReview[reviewType]), (title) => {
          // get match with highest confidence level and use that one
          const personPubs = this.publicationsGroupedByTitleByReview[reviewType][title]
          let currentPersonPub
          _.each(personPubs, (personPub, index) => {
            if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
              currentPersonPub = personPub
            }
          })
          return currentPersonPub
        })
      })

      // console.log(`Publications grouped by title by review: ${JSON.stringify(this.publicationsGroupedByTitleByReview, null, 2)}`)

      // check for any doi's with reviews out of sync
      const publicationTitlesOutOfSync = []

      _.each(_.keys(publicationTitlesByReviewType), (title) => {
        if (_.keys(publicationTitlesByReviewType[title]).length > 1) {
          console.log(`Warning: Title out of sync found: ${title} for person id: ${this.person.id} title record: ${JSON.stringify(publicationTitlesByReviewType[title], null, 2)}`)
          publicationTitlesOutOfSync.push(title)
        }
      })

      if (publicationTitlesOutOfSync.length > 0) {
        console.log(`Warning: Titles found with reviews out of sync: ${JSON.stringify(publicationTitlesOutOfSync, null, 2)}`)
      }

      // initialize the list in view
      this.setCurrentPersonPublicationsCombinedMatches()
      // console.log(`Funders by Doi ${JSON.stringify(_.keys(this.fundersByDoi).length, null, 2)}`)
    },
    async filterPublications () {
      let filterOutCurrentPublication = false
      this.filteredPersonPublicationsCombinedMatchesByReview = _.mapValues(
        this.personPublicationsCombinedMatchesByReview,
        (personPublications) => {
          return _.filter(personPublications, (item) => {
            let includePublication = item.publication.title.toLowerCase().includes(this.pubSearch.toLowerCase().trim())
            if (includePublication) {
              // also check if confidence is to be filtered out
              // console.log('checking if we should include publication')
              // console.log(`confidence val is: ${this.getPublicationConfidence(item)}`)
              if (this.selectedPersonConfidence === '50%' && this.getPublicationConfidence(item) < 0.50) {
                // console.log('trying to filter out publication')
                includePublication = false
              }
            }
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
    async loadPublications (person) {
      this.startProgressBar()
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
          query: readPersonPublications,
          variables: {
            personId: this.person.id,
            // userId: this.userId,   // commenting out for now to have any review from any user visible for now and actionable by any user
            yearMin: this.selectedPubYears.min,
            yearMax: this.selectedPubYears.max
          },
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications for person id: ${this.person.id} ${moment().format('HH:mm:ss:SSS')}`)
        // check if person selected changed when clicks happen rapidly and if so abort
        if (this.person.id === person.id) {
          this.publications = _.map(pubsWithReviewResult.data.persons_publications, (personPub) => {
            // change doi to lowercase
            _.set(personPub.publication, 'doi', _.toLower(personPub.publication.doi))
            return personPub
          })
          this.loadPersonPublicationsCombinedMatches()
        } else {
          console.log(`Detected change in person selected abort query for person id: ${person.id}`)
        }
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
      await this.loadPublicationAuthors(personPublication)
      await this.loadConfidenceSet(personPublication)
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
      _.set(this.publication, 'doi', _.toLower(this.publication.doi))
      // console.log(`Loaded Publication: ${JSON.stringify(this.publication)}`)
      console.log(`Publication journal is: ${JSON.stringify(this.publication.journal_title, null, 2)}`)
      this.publicationCitation = this.getCitationApa(this.publication.csl_string)
      this.publicationJournalClassifications = _.map(this.publication.journal.journals_classifications_aggregate.nodes, (node) => {
        return node.classification
      })
      console.log(`Found Journal Classifications: ${JSON.stringify(this.publicationJournalClassifications, null, 2)}`)
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
      // add the review for personPublications with the same title in the list
      let title = personPublication.publication.title
      const personPubs = this.publicationsGroupedByTitleByReview[this.reviewTypeFilter][title]

      try {
        let mutateResults = []
        await _.each(personPubs, async (personPub) => {
          // const personPub = personPubs[0]
          console.log(`Adding Review for person publication: ${personPub.id}`)
          const mutateResult = await this.$apollo.mutate(
            insertReview(this.userId, personPub.id, reviewType, 'ND')
          )
          console.log('&&', reviewType, this.reviewTypeFilter)
          if (mutateResult && personPub.id === personPublication.id) {
            this.$refs[`personPub${index}`].hide()
            Vue.delete(this.personPublicationsCombinedMatches, index)
            // transfer from one review queue to the next primarily for counts, other sorting will shake out on reload when clicking the tab
            // remove from current lists
            _.unset(this.publicationsGroupedByTitleByReview[this.reviewTypeFilter], title)
            _.remove(this.personPublicationsCombinedMatchesByReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            _.remove(this.filteredPersonPublicationsCombinedMatchesByReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            // add to new lists
            this.publicationsGroupedByTitleByReview[reviewType][title] = personPubs
            this.personPublicationsCombinedMatchesByReview[reviewType].push(personPub)
            this.filteredPersonPublicationsCombinedMatchesByReview[reviewType].push(personPub)
            if (this.reviewTypeFilter === 'pending' && this.selectedPersonTotal === 'Pending') {
              const currentPersonIndex = _.findIndex(this.people, (person) => {
                return person.id === this.person.id
              })
              this.personReviewedPubCounts[this.person.id] += 1
              this.people[currentPersonIndex].person_publication_count -= 1
              await this.changedPendingCounts(currentPersonIndex)
              // this.people[currentPersonIndex].reviews_persons_publications_aggregate.aggregate.count = 1
              this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count -= 1
            } else if (this.selectedPersonTotal === 'Pending' && reviewType === 'pending') {
              const currentPersonIndex = _.findIndex(this.people, (person) => {
                return person.id === this.person.id
              })
              this.personReviewedPubCounts[this.person.id] -= 1
              this.people[currentPersonIndex].person_publication_count += 1
              await this.changedPendingCounts(currentPersonIndex)
              // this.people[currentPersonIndex].reviews_persons_publications_aggregate.aggregate.count += 1
              this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count += 1
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
    async clickReviewPending (index, person, personPublication) {
      await this.addReview(index, person, personPublication, 'pending')
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
      this.selectedCenterPubSort = this.selectedCenterPubSort
      this.selectedPersonSort = this.preferredPersonSort
      this.selectedPersonTotal = this.preferredPersonTotal
      this.selectedPersonConfidence = this.preferredPersonConfidence
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
  mounted () {
    this.$refs.personScroll.scrollTo(this.personScrollIndex)
  },
  computed: {
    personSortKey: sync('filter/personSortKey'),
    userId: sync('auth/userId'),
    isLoggedIn: sync('auth/isLoggedIn'),
    selectedCenter: sync('filter/selectedCenter'),
    preferredPersonSort: get('filter/preferredPersonSort'),
    preferredPersonPubSort: get('filter/preferredPersonPubSort'),
    preferredCenterPubSort: get('filter/preferredCenterPubSort'),
    preferredPersonTotal: get('filter/preferredPersonTotal'),
    preferredPersonConfidence: get('filter/preferredPersonConfidence'),
    selectedInstitutions: sync('filter/selectedInstitutions'),
    institutionOptions: get('filter/institutionOptions'),
    selectedPersonSort: sync('filter/selectedPersonSort'),
    selectedPersonPubSort: sync('filter/selectedPersonPubSort'),
    selectedCenterPubSort: sync('filter/selectedCenterPubSort'),
    selectedPersonTotal: sync('filter/selectedPersonTotal'),
    selectedPersonConfidence: sync('filter/selectedPersonConfidence'),
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
