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
            <q-item header>
              <q-item-label header>Center and Institute Review</q-item-label>
            </q-item>
              <CenterReviewPubFilter />
              <q-tabs
                v-model="reviewTypeFilter"
                dense
              >
                <q-tab name="pending" :label="`Pending (${getpublicationsGroupedByDoiByOrgReviewCount('pending')})`" />
                <q-tab name="accepted" :label="`Accepted (${getpublicationsGroupedByDoiByOrgReviewCount('accepted')})`" />
                <q-tab name="rejected" :label="`Rejected (${getpublicationsGroupedByDoiByOrgReviewCount('rejected')})`" />
                <q-tab name="unsure" :label="`Unsure (${getpublicationsGroupedByDoiByOrgReviewCount('unsure')})`" />
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
              <q-separator/>
              <download-csv
                v-if="publicationsLoaded && !publicationsLoadedError"
                class="cursor-pointer"
                :name="`${reviewTypeFilter}_center_institute_review_${getSimpleFormatAuthorName(selectedCenterAuthor)}.csv`"
                :data="getPublicationsCSVResult(personPublicationsCombinedMatches)">
                <q-btn flat
                  style="align:left;width:100%"
                  icon="cloud_download"
                  color="primary"
                >
                  <q-item-section header align="left">&nbsp;Download Results</q-item-section>
                </q-btn>
              </download-csv>
              <q-virtual-scroll
                :items="personPublicationsCombinedMatches"
                separator
                bordered
                :virtual-scroll-item-size="50"
                :style="{'max-height': ($q.screen.height-50-88-36-8)+'px'}"
                :ref="`pubScroll`"
              >
                <template v-slot="{ item, index }">
                  <q-expansion-item
                    :key="item.id"
                    clickable
                    @click="loadPublication(item);showCurrentSelectedPublication(true)"
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
                        <q-item-label v-if="selectedInstitutionReviewState === 'Accepted'" style="width:100%" class="text-grey-9" lines="1"><strong>{{selectedInstitutionReviewState}} Authors:</strong> {{ sortAuthorsByDoi[selectedInstitutionReviewState.toLowerCase()][item.publication.doi] }}</q-item-label>
                        <q-item-label v-else style="width:100%" class="text-grey-9" lines="1"><strong>{{selectedInstitutionReviewState}} Authors:</strong> {{ sortAuthorsByDoi[selectedInstitutionReviewState.toLowerCase()][item.publication.doi] }}</q-item-label>
                        <q-list class="q-pt-sm">
                          <q-btn
                            @click.capture.stop
                            rounded
                            dense
                            size="sm"
                            v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(publicationsGroupedByDoi[item.publication.doi])"
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
                      <!--<q-item-section avatar side>
                        <q-badge
                          :label="getPublicationConfidence(item)*100+'%'"
                          :color="getPublicationConfidence(item)*100 < 50 ? 'amber-10' : 'green'"
                        />
                      </q-item-section>-->
                    </template>
                    <q-card v-if="item.publication !== undefined">
                      <q-card-section dense align="center" class="text-center">
                        <q-item-label align="left">Move To:</q-item-label>
                        <q-btn dense v-if="reviewTypeFilter!=='pending'" color="purple" label="Pending" class="on-left" @click="clickReviewPending(index, person, personPublication);" />
                        <q-btn dense v-if="reviewTypeFilter!=='accepted'" color="blue" label="Accepted" class="on-left" @click="clickReviewAccepted(index, person, personPublication);" />
                        <q-btn dense v-if="reviewTypeFilter!=='rejected'" color="red" label="Rejected" class="on-left" @click="clickReviewRejected(index, person, personPublication);" />
                        <q-btn dense v-if="reviewTypeFilter!=='unsure'" color="grey" label="Unsure" class="on-left" @click="clickReviewUnsure(index, person, personPublication);" />
                      </q-card-section>
                      <q-card-section>
                        <q-table
                         :title="`ND Author Review ${selectedInstitutionReviewState}`"
                         :data="getInstitutionReviewedAuthors(item.publication.doi, selectedInstitutionReviewState.toLowerCase())"
                         :columns="reviewedAuthorColumns"
                         row-key="id"
                         dense
                        >
                         <q-tr v-if="(selectedInstitutionReviewState.toLowerCase()==='accepted' && acceptedAuthors.length <= 0 || selectedInstitutionReviewState.toLowerCase()==='rejected' && rejectedAuthors.length <= 0 || selectedInstitutionReviewState.toLowerCase()==='unsure' && unsureAuthors.length <= 0)" slot="bottom-row">
                          <q-td align="left" colspan="100%">
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>None</i>
                          </q-td>
                         </q-tr>
                        </q-table>
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
                    <q-card-section v-if="personPublication.publication.doi">
                      <q-item-label align="left"><strong>View Article:</strong></q-item-label>
                      <q-list class="q-pt-sm q-pb-sm">
                        <q-btn
                          rounded
                          dense
                          no-wrap
                          size="md"
                          v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(publicationsGroupedByDoi[personPublication.publication.doi])"
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
                        v-if="personPublication"
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
                    <q-card-section v-if="publication&&publication.journal!==undefined&&publication.journal!==null" class="text-left">
                      <q-item-label><b>Journal Title:&nbsp;</b>{{ publication.journal.title }}</q-item-label>
                    </q-card-section>
                    <q-card-section v-if="publication&&publication.awards!==undefined&&publication.awards.length>0" class="text-left">
                      <q-item-label><b>Funding Awards:</b></q-item-label>
                      <q-item-label :key="index" v-for="(award, index) in publication.uniqueAwards" lines="1">- {{award.funder_name}} ({{award.funder_award_identifier}})</q-item-label>
                    </q-card-section>
                    <!--<q-card-section v-if="personPublication.publication.csl_subject && personPublication.publication.csl_subject.length > 0" dense class="text-left">
                      <q-item-label><b>Subjects:</b></q-item-label>
                      <q-item>{{personPublication.publication.csl_subjects}}</q-item>
                    </q-card-section>
                    <q-card-section v-else dense class="text-left">
                      <q-item-label><b>Subjects:</b> Unavailable</q-item-label>
                    </q-card-section>-->
                    <q-card-section v-if="personPublication.publication.abstract && personPublication.publication.abstract.length > 0" dense class="text-left">
                      <q-item-label><b>Abstract:</b></q-item-label>
                      <q-item>{{personPublication.publication.abstract}}</q-item>
                    </q-card-section>
                    <q-card-section v-else dense class="text-left">
                      <q-item-label><b>Abstract:</b> Unavailable</q-item-label>
                    </q-card-section>
                    <q-card-section v-if="publication&&publication.journal!==undefined" class="text-left">
                      <q-item-label><b>Journal Subjects:</b></q-item-label>
                      <q-item-label :key="index" v-for="(classification, index) in publicationJournalClassifications" lines="1">- {{classification.name}}</q-item-label>
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
                          <q-item-label>Title</q-item-label>
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
                  <q-card class="col-xs-7">
                    <q-card-section>
                      <q-table
                        title="Accepted Authors"
                        :data="acceptedAuthors"
                        :columns="reviewedAuthorColumns"
                        row-key="id"
                        :hide-bottom="acceptedAuthors.length <= 0"
                      >
                        <q-tr v-if="acceptedAuthors.length <= 0" slot="bottom-row">
                          <q-td align="left" colspan="100%">
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>None</i>
                          </q-td>
                        </q-tr>
                      </q-table>
                    </q-card-section>
                    <q-card-section>
                      <q-table
                        title="Rejected Authors"
                        :data="rejectedAuthors"
                        :columns="reviewedAuthorColumns"
                        row-key="id"
                        :hide-bottom="rejectedAuthors.length <= 0"
                      >
                        <q-tr v-if="rejectedAuthors.length <= 0" slot="bottom-row">
                          <q-td align="left" colspan="100%">
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>None</i>
                          </q-td>
                        </q-tr>
                      </q-table>
                    </q-card-section>
                    <q-card-section>
                      <q-table
                        title="Unsure Authors"
                        :data="unsureAuthors"
                        :columns="reviewedAuthorColumns"
                        row-key="id"
                        :hide-bottom="unsureAuthors.length <= 0"
                      >
                        <q-tr v-if="unsureAuthors.length <= 0" slot="bottom-row">
                          <q-td align="left" colspan="100%">
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>None</i>
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
// add csv downloader
import JsonCSV from 'vue-json-csv'
// const { getScrollPosition, setScrollPosition } = scroll
import readPersons from '../gql/readPersons'
// import readPersonsByInstitution from '../gql/readPersonsByInstitution'
// import readPublicationsByPerson from '../gql/readPublicationsByPerson'
// import readPublicationsByPersonByReview from '../gql/readPublicationsByPersonByReview'
import readAuthorsByPublication from '../gql/readAuthorsByPublication'
// import readConfidenceSetItems from '../gql/readConfidenceSetItems'
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
// import readPersonPublicationsConfidenceSets from '../gql/readPersonPublicationsConfidenceSets'
// import readPersonPublicationsReviewsConfidenceSets from '../gql/readPersonPublicationsReviewsConfSets'
import readPersonPublicationsReviews from '../gql/readPersonPublicationsReviews'
// import readPersonPublicationsHCRIReviews from '../gql/readPersonPublicationsHCRIReviews'
import readAuthorsByPublications from '../gql/readAuthorsByPublications'
// import readPublicationsByReviewState from '../../../gql/readPublicationsByReviewState.gql'
import readPublication from '../../../gql/readPublication.gql'
// import * as service from '@porter/osf.io';

import CenterReviewPubFilter from '../components/CenterReviewPubFilter.vue'
import PeopleFilter from '../components/PeopleFilter.vue'
import YearFilter from '../components/YearFilter.vue'
import MemberYearFilter from '../components/MemberYearFilter.vue'
import sanitize from 'sanitize-filename'
import moment from 'moment'
import pMap from 'p-map'
// import VueFuse from 'vue-fuse'

// Vue.use(VueFuse)

export default {
  name: 'PageIndex',
  components: {
    CenterReviewPubFilter,
    PeopleFilter,
    YearFilter,
    MemberYearFilter,
    'download-csv': JsonCSV
  },
  data: () => ({
    reviewStates: undefined,
    selectedReviewState: undefined,
    institutionReviewState: undefined,
    dom,
    date,
    firstModel: 600,
    secondModel: 500,
    people: [],
    publications: [],
    publicationsGroupedByInstitutionReview: {},
    personPublicationsCombinedMatches: [],
    personPublicationsCombinedMatchesByReview: {},
    personPublicationsCombinedMatchesByOrgReview: {},
    filteredPersonPublicationsCombinedMatchesByOrgReview: {},
    publicationsGroupedByDoiByInstitutionReview: {},
    publicationsGroupedByDoiByOrgReview: {},
    publicationsGroupedByDoi: {},
    sortAuthorsByDoi: {}, // map of doi's to the matched author to sort by (i.e., the matched author with the lowest matched position)
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
    authorsByDoi: {},
    confidenceSetitems: [],
    confidenceSet: undefined,
    acceptedAuthors: [],
    rejectedAuthors: [],
    unsureAuthors: [],
    matchedPublicationAuthors: [],
    matchedPublicationAuthorsByDoi: {},
    reviewQueueKey: 0,
    publicationCitation: undefined,
    publicationJournalClassifications: [],
    showReviewStates: [],
    filteredPersonPubCounts: {},
    // fundersByDoi: {},
    // pubMedFundersByDoi: {},
    // combinedFundersByDoi: {},
    // uniqueFunders: {},
    // for progress bar
    progress: 0,
    buffer: 0,
    publicationsLoaded: false,
    publicationsLoadedError: false,
    showProgressBar: false,
    reviewedAuthorColumns: [
      { name: 'family_name', align: 'left', label: 'Family Name', field: 'family_name', sortable: true },
      { name: 'given_name', align: 'left', label: 'Given Name', field: 'given_name', sortable: true }
    ],
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
    selectedInstitutionReviewState: async function () {
      this.selectedCenterAuthor = this.preferredSelectedCenterAuthor
      this.loadPersonPublicationsCombinedMatches()
    },
    selectedCenterPubSort: async function () {
      await this.sortPublications()
      this.showCurrentSelectedPublication(true)
    },
    selectedCenterAuthor: async function () {
      this.setCurrentPersonPublicationsCombinedMatches()
    },
    selectedPersonTotal: function () {
      this.loadPersonsWithFilter()
    },
    selectedPersonConfidence: function () {
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
    getSimpleFormatAuthorName (authorName) {
      let obj = (authorName) ? authorName.split('(')[0] : ''
      obj = obj.replace(' ', '_').replace(',', '')
      return obj.toLowerCase().trim()
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
      // first group by and then grab first one only to remove duplicates across authors
      const groupedPersonPubs = _.groupBy(personPublications, (personPublication) => {
        return personPublication.publication.source_name
      })
      const reducedPersonPubs = _.mapValues(groupedPersonPubs, (personPubs) => {
        if (personPubs) {
          return personPubs[0]
        } else {
          return undefined
        }
      })
      // then sort
      return _.sortBy(reducedPersonPubs, (personPublication) => {
      // return _.sortBy(personPublications, (personPublication) => {
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
    getpublicationsGroupedByDoiByOrgReviewCount (reviewType) {
      return this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType] ? this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType].length : 0
    },
    getInstitutionReviewedAuthors (doi, reviewType) {
      const personPubs = this.publicationsGroupedByDoiByInstitutionReview[reviewType][doi]
      // console.log(`Person pubs on get author review: ${JSON.stringify(this.publicationsGroupedByDoiByReview, null, 2)}`)
      const reviewedAuthors = {}
      _.each(personPubs, (personPub) => {
        const reviewedAuthor = this.getReviewedAuthor(personPub)
        if (!reviewedAuthors[reviewedAuthor.id]) {
          reviewedAuthors[reviewedAuthor.id] = reviewedAuthor
        }
      })
      if (reviewedAuthors.length > 1) {
        console.log(`Reviewed authors are: ${JSON.stringify(reviewedAuthors, null, 2)}`)
      }
      return _.values(reviewedAuthors)
    },
    getDoiPersonPublicationsByReview (doi) {
      const personPubsByReview = {}
      _.each(_.keys(this.publicationsGroupedByDoiByInstitutionReview), (reviewType) => {
        if (this.publicationsGroupedByDoiByInstitutionReview[reviewType][doi]) {
          const pubsGroupedByPersonId = _.groupBy(this.publicationsGroupedByDoiByInstitutionReview[reviewType][doi], (personPub) => {
            return personPub.person_id
          })
          personPubsByReview[reviewType] = _.map(_.keys(pubsGroupedByPersonId), (personId) => {
            let currentPersonPub
            _.each(pubsGroupedByPersonId[personId], (personPub, index) => {
              if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
                currentPersonPub = personPub
              }
            })
            return currentPersonPub
          })
        }
      })
      return personPubsByReview
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
      // convert all dois in pubs to lowercase
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
    async showReviewState (reviewState) {
      const test = _.includes(this.filterReviewStates, reviewState.name)
      console.log(`checking show review state for: ${reviewState.name} result is: ${test}, filter review states are: ${JSON.stringify(this.filterReviewStates, null, 2)}`)
      return test
    },
    async setSelectedReviewState (reviewState) {
      this.selectedReviewState = reviewState
    },
    async scrollToPublication (index) {
      // console.log(`updating scroll ${index} for ${this.selectedReviewState} ${this.$refs['pubScroll'].toString}`)
      console.log(`In scroll to position method for ${index}`)
      // console.log(`Current item position: ${this.$refs['pubScroll'].position().left}`)
      // console.log(`Next item position: ${this.$refs['pubScroll'].getBoundingClientRect()}`)
      this.$refs['pubScroll'].scrollTo(index)
    },
    async showCurrentSelectedPublication (pubIsExpanded) {
      if (this.personPublication) {
        // check people still contains the person if not clear out states
        const currentPubIndex = _.findIndex(this.personPublicationsCombinedMatches, (personPublication) => {
          return personPublication.id === this.personPublication.id
        })
        if (currentPubIndex >= 0) {
          let newScrollIndex = currentPubIndex
          const prevScrollIndex = this.$refs['pubScroll']['prevToIndex']
          let scrollDifferential = newScrollIndex - prevScrollIndex
          let scrollAdjustment = 0
          if (newScrollIndex !== 0) {
            if (scrollDifferential > 0) {
              // move two extra indexes in the right direction to account for the large rows and then another index per 100 items as it tends to shift
              // if needs to move down, move that number more, if needs to move up, move that number up (i.e., subtract not add)
              scrollAdjustment = Math.floor(1.5 + (scrollDifferential / 100)) // round to nearest index factor
            } else if (scrollDifferential < 0) {
              scrollAdjustment = -1 * Math.floor(1.5 + (-1 * scrollDifferential / 100))
            }
          }
          newScrollIndex += scrollAdjustment
          console.log(`Scrolling to pub index: ${newScrollIndex} for current pub index: ${currentPubIndex} previous index was ${prevScrollIndex}`)
          await this.$refs['pubScroll'].scrollTo(newScrollIndex)

          // console.log(this.$refs)
          if (pubIsExpanded) {
            this.$refs[`personPub${currentPubIndex}`].show()
          }
        } else {
          console.log(`Person Publication id: ${this.personPublication.id} no longer found.  Clearing UI states...`)
          // clear everything out
          this.clearPublication()
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
          return this.getFilteredPersonPubCount(this.selectedInstitutionReviewState.toLowerCase(), person)
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
      await this.loadCenterAuthorOptions()
    },
    async loadCenterAuthorOptions () {
      let obj = ['All']
      _.each(this.people, (person) => {
        obj.push(`${this.getAuthorString(person)} (${this.getFilteredPersonPubCount(this.selectedInstitutionReviewState.toLowerCase(), person)})`)
      })
      this.centerAuthorOptions = obj
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
    // replace diacritics with alphabetic character equivalents
    normalizeString (value) {
      if (_.isString(value)) {
        const newValue = _.clone(value)
        const norm1 = newValue
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        // the u0027 also normalizes the curly apostrophe to the straight one
        const norm2 = norm1.replace(/[\u2019]/g, '\u0027')
        // remove periods and other remaining special characters
        const norm3 = norm2.replace(/[&\\#,+()$~%.'":*?<>{}!]/g, '')
        return norm3
      } else {
        return value
      }
    },
    // remove diacritic characters (used later for fuzzy matching of names)
    normalizeObjectProperties (object, properties) {
      const newObject = _.clone(object)
      _.each(properties, (property) => {
        newObject[property] = this.normalizeString(newObject[property])
      })
      return newObject
    },
    lastNameMatchFuzzy (last, lastKey, nameMap) {
      // first normalize the diacritics
      const testNameMap = _.map(nameMap, (name) => {
        return this.normalizeObjectProperties(name, [lastKey])
      })
      // normalize last name checking against as well
      const testLast = this.normalizeString(last)
      // console.log(`After diacritic switch ${JSON.stringify(nameMap, null, 2)} converted to: ${JSON.stringify(testNameMap, null, 2)}`)
      //   const lastFuzzy = new VueFuse(testNameMap, {
      //     caseSensitive: false,
      //     shouldSort: true,
      //     includeScore: false,
      //     keys: [lastKey],
      //     findAllMatches: true,
      //     threshold: 0.067
      //   })

      const lastNameResults = this.$search(testLast, testNameMap, {
        caseSensitive: false,
        shouldSort: true,
        includeScore: false,
        keys: [lastKey],
        findAllMatches: true,
        threshold: 0.067
      })
      // console.log(`For testing: ${testLast} Last name results: ${JSON.stringify(lastNameResults, null, 2)}`)
      return lastNameResults.length > 0 ? lastNameResults[0] : null
    },
    getAuthorsString (authors) {
      let authorString = ''
      _.forEach(authors, (author, index) => {
        if (index > 0) {
          authorString = `${authorString}; `
        }
        authorString = `${authorString}${this.getAuthorString(author)}`
      })
      return authorString
    },
    getAuthorString (author) { //, includeCounts) {
      let obj = `${author.family_name}, ${author.given_name}`
      // if (includeCounts &&
      //   author.persons_publications_metadata_aggregate &&
      //   author.persons_publications_metadata_aggregate.aggregate &&
      //   author.persons_publications_metadata_aggregate.aggregate.count) {
      //   obj = `${obj} (${author.persons_publications_metadata_aggregate.aggregate.count})`
      // }
      return obj
    },
    getSourceUriString (personPubs) {
      let sourceUriString = ''
      _.forEach(personPubs, (personPub, index) => {
        if (index > 0) {
          sourceUriString = `${sourceUriString}; `
        }
        sourceUriString = `${sourceUriString}${this.getSourceUri(personPub)}`
      })
      return sourceUriString
    },
    // similar to getMatchedPublicationAuthors except working against data from csl
    // if 'returnPersonPubAuthors is true it returns an array of matched personPubAuthors instead of the matched csl author object
    getMatchedCslAuthors (cslAuthors, personPublications, returnPersonPubAuthors) {
      const matchedAuthorsIds = {}
      const matchedAuthors = []
      _.each(cslAuthors, (author) => {
        _.each(personPublications, (personPublication) => {
          // if (this.lastNameMatchFuzzy(personPublication.person.family_name, 'family', cslAuthors)) {
          if (_.lowerCase(personPublication.person.family_name) === _.lowerCase(author['family'])) {
            if (returnPersonPubAuthors) {
              if (!matchedAuthorsIds[personPublication.person.id]) {
                matchedAuthorsIds[personPublication.person.id] = true
                matchedAuthors.push(personPublication.person)
              }
            } else {
              matchedAuthors.push(author)
            }
          }
        })
      })
      return matchedAuthors
    },
    getMatchedPublicationAuthors (personPublication, reviewedAuthors) {
      return _.filter(this.publicationAuthors, function (author) {
        let matchFound = false
        _.each(reviewedAuthors, (reviewedAuthor) => {
          if (author.family_name.toLowerCase() === reviewedAuthor.family_name.toLowerCase()) {
            matchFound = true
          }
        })
        return matchFound
      })
    },
    async loadPublicationAuthors (personPublication, reviewedAuthors) {
      this.publicationAuthors = []
      const publicationId = personPublication.publication.id
      const result = await this.$apollo.query(readAuthorsByPublication(publicationId))
      this.publicationAuthors = result.data.publications_authors
      // console.log(`Loaded Publication Authors: ${JSON.stringify(this.publicationAuthors)}`)
      // load up author positions of possible matches
      this.matchedPublicationAuthors = this.getMatchedPublicationAuthors(personPublication, reviewedAuthors)
      // console.log(`Matched authors are: ${JSON.stringify(this.matchedPublicationAuthors, null, 2)}`)
    },
    // async loadConfidenceSet (personPublication) {
    //   this.confidenceSetItems = []
    //   this.confidenceSet = undefined
    //   // console.log(`Trying to load confidence sets for pub: ${JSON.stringify(personPublication, null, 2)}`)
    //   if (personPublication.confidencesets_aggregate &&
    //     personPublication.confidencesets_aggregate.nodes.length > 0) {
    //     this.confidenceSet = personPublication.confidencesets_aggregate.nodes[0]
    //     // console.log('getting confidence set items...')
    //     const result = await this.$apollo.query(readConfidenceSetItems(this.confidenceSet.id))
    //     this.confidenceSetItems = result.data.confidencesets_items
    //     this.confidenceSetItems = _.transform(this.confidenceSetItems, (result, setItem) => {
    //       // console.log(`Trying to set properties for confidence set item: ${JSON.stringify(setItem, null, 2)}`)
    //       _.set(setItem, 'confidence_type_name', setItem.confidence_type.name)
    //       _.set(setItem, 'confidence_type_rank', setItem.confidence_type.rank)
    //       _.set(setItem, 'confidence_type_desc', setItem.confidence_type.description)
    //       result.push(setItem)
    //     }, [])
    //   }
    // },
    async fetchData () {
      await this.loadReviewStates()
      await this.loadPublications()
    },
    async clearPublications () {
      this.publications = []
      this.personPublicationsCombinedMatches = []
      this.personPublicationsCombinedMatchesByReview = {}
      this.personPublicationsCombinedMatchesByOrgReview = {}
      this.filteredPersonPublicationsCombinedMatchesByOrgReview = {}
      this.publicationsGroupedByDoiByOrgReview = {}
      this.publicationsGroupedByDoiByInstitutionReview = {}
      this.publicationsGroupedByDoi = {}
      this.confidenceSetItems = []
      this.confidenceSet = undefined
      this.filteredPersonPubCounts = {}
    },
    async setCurrentPersonPublicationsCombinedMatches () {
      let reviewType = 'pending'
      if (this.reviewTypeFilter) {
        reviewType = this.reviewTypeFilter
      }
      this.filterPublications()
      this.personPublicationsCombinedMatches = this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType]

      // finally sort the publications
      await this.sortPublications()

      this.showCurrentSelectedPublication(true)
    },
    getPublicationsCSVResult (personPublications) {
      return _.map(personPublications, (personPub) => {
        return this.getPubCSVResultObject(personPub)
      })
    },
    getPubCSVResultObject (personPublication) {
      return {
        authors: this.sortAuthorsByDoi[this.selectedInstitutionReviewState.toLowerCase()][personPublication.publication.doi],
        title: personPublication.publication.title.replace(/\n/g, ' '),
        doi: this.getCSVHyperLinkString(personPublication.publication.doi, this.getDoiUrl(personPublication.publication.doi)),
        journal: (personPublication.publication.journal) ? personPublication.publication.journal.title : '',
        year: personPublication.publication.year,
        source_names: JSON.stringify(_.map(this.getSortedPersonPublicationsBySourceName(this.publicationsGroupedByDoi[personPublication.publication.doi]), (pub) => { return pub.publication.source_name })),
        sources: this.getSourceUriString(this.getSortedPersonPublicationsBySourceName(this.publicationsGroupedByDoi[personPublication.publication.doi])),
        abstract: personPublication.publication.abstract
      }
    },
    getCSVHyperLinkString (showText, url) {
      return `${url}`
    },
    async loadPersonPublicationsCombinedMatches () {
      console.log(`Start group by publications ${moment().format('HH:mm:ss:SSS')}`)
      this.publicationsGroupedByDoi = _.groupBy(this.publications, (personPub) => {
        return `${personPub.publication.doi}`
      })

      // this.fundersByDoi = {}
      // this.pubMedFundersByDoi = {}
      // this.combinedFundersByDoi = {}
      // this.uniqueFunders = {}
      this.filteredPersonPubCounts = {}
      // group by institution (i.e., ND author) review and then by doi
      let pubsByDoi = {}
      this.publicationsGroupedByInstitutionReview = _.groupBy(this.publications, function (personPub) {
        let reviewType = 'pending'
        const doi = personPub.publication.doi
        // if (doi === '10.1101/gad.307116.117') {
        //   console.log(`Person pub for doi 10.1101/gad.307116.117 is: ${JSON.stringify(personPub, null, 2)}`)
        // }
        if (personPub.reviews && personPub.reviews.length > 0) {
          reviewType = personPub.reviews[0].review_type
        }
        if (!pubsByDoi[reviewType]) {
          pubsByDoi[reviewType] = {}
        }
        if (!pubsByDoi[reviewType][doi]) {
          pubsByDoi[reviewType][doi] = []
        }
        pubsByDoi[reviewType][doi].push(personPub)
        return reviewType
      })

      // console.log(`Pubs by doi are: ${JSON.stringify(pubsByDoi, null, 2)}`)
      // put in pubs grouped by doi for each review status
      this.publicationsGroupedByDoiByInstitutionReview = pubsByDoi
      console.log(`Finish group by publications ${moment().format('HH:mm:ss:SSS')}`)
      // initialize the pub author matches
      this.matchedPublicationAuthorsByDoi = _.mapValues(this.authorsByDoi, (cslAuthors, doi) => {
        // console.log(`DOIs that are matched: ${JSON.stringify(_.keys(this.publicationsGroupedByDoiByInstitutionReview), null, 2)}`)
        return this.getMatchedCslAuthors(cslAuthors, this.publicationsGroupedByDoiByInstitutionReview['accepted'][doi], true)
      })
      this.sortAuthorsByDoi = {}
      this.sortAuthorsByDoi['accepted'] = _.mapValues(this.matchedPublicationAuthorsByDoi, (matchedAuthors) => {
        this.updateFilteredPersonPubCounts('accepted', matchedAuthors)
        return this.getAuthorsString(matchedAuthors)
      })
      this.sortAuthorsByDoi['rejected'] = _.mapValues(this.publicationsGroupedByDoiByInstitutionReview['rejected'], (personPubs, doi) => {
        return this.getAuthorsString(this.getInstitutionReviewedAuthors(doi, 'rejected'))
      })
      this.sortAuthorsByDoi['unsure'] = _.mapValues(this.publicationsGroupedByDoiByInstitutionReview['unsure'], (personPubs, doi) => {
        return this.getAuthorsString(this.getInstitutionReviewedAuthors(doi, 'unsure'))
      })

      // console.log(`Matched pub authors by doi: ${JSON.stringify(this.matchedPublicationAuthorsByDoi, null, 2)}`)

      const doisPresent = {}
      this.personPublicationsCombinedMatchesByReview = {}
      // console.log(`Person pubs grouped by DOI are: ${JSON.stringify(this.publicationsGroupedByDoiByReview, null, 2)}`)
      // grab one with highest confidence to display and grab others via doi later when changing status
      // instead of random order add them sequentially to not have duplicates in rejected,
      // unsure if in accepted and then not in rejected if unsure and not in accepted
      this.personPublicationsCombinedMatchesByReview['accepted'] = await _.map(_.keys(this.publicationsGroupedByDoiByInstitutionReview['accepted']), (doi) => {
        // get match with highest confidence level and use that one
        const personPubs = this.publicationsGroupedByDoiByInstitutionReview['accepted'][doi]
        let currentPersonPub
        _.each(personPubs, (personPub, index) => {
          if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
            currentPersonPub = personPub
            // if (currentPersonPub.publication.crossref_funders && currentPersonPub.publication.crossref_funders.length > 0) {
            //   this.fundersByDoi[doi] = (currentPersonPub.publication.crossref_funders) ? currentPersonPub.publication.crossref_funders : []
            //   this.combinedFundersByDoi[doi] = (currentPersonPub.publication.crossref_funders) ? currentPersonPub.publication.crossref_funders : []
            //   _.each(this.fundersByDoi[doi], (funder) => {
            //     console.log(`Getting name from funder: ${JSON.stringify(funder, null, 2)}`)
            //     const funderName = funder['name']
            //     console.log(`Got name ${funderName} from funder: ${JSON.stringify(funder, null, 2)}`)
            //     if (funderName) {
            //       if (!this.uniqueFunders[funderName]) {
            //         this.uniqueFunders[funderName] = []
            //       }
            //       if (this.uniqueFunders[funderName]) {
            //         console.log(`Pushing funder name: ${funderName}`)
            //         this.uniqueFunders[funderName].push(funder)
            //       }
            //     }
            //     console.log(`doi: ${doi} crossref funders: ${JSON.stringify(funder, null, 2)}`)
            //   })
            // }

            // if (currentPersonPub.publication.pubmed_funders && currentPersonPub.publication.pubmed_funders.length > 0) {
            //   this.pubMedFundersByDoi[doi] = (currentPersonPub.publication.pubmed_funders) ? currentPersonPub.publication.pubmed_funders : []
            //   this.combinedFundersByDoi[doi] = (currentPersonPub.publication.pubmed_funders) ? currentPersonPub.publication.pubmed_funders : []
            //   _.each(this.pubMedFundersByDoi[doi], (funder) => {
            //     console.log(`Getting name from funder: ${JSON.stringify(funder, null, 2)}`)
            //     const funderName = funder['funder']
            //     console.log(`Got name ${funderName} from funder: ${JSON.stringify(funder, null, 2)}`)
            //     if (funderName) {
            //       if (!this.uniqueFunders[funderName]) {
            //         this.uniqueFunders[funderName] = []
            //       }
            //       if (this.uniqueFunders[funderName]) {
            //         console.log(`Pushing funder name: ${funderName}`)
            //         this.uniqueFunders[funderName].push(funder)
            //       }
            //     }
            //     console.log(`doi: ${doi} pubmed funders: ${JSON.stringify(funder, null, 2)}`)
            //   })
            // }
          }
        })
        doisPresent[doi] = true
        return currentPersonPub
      })

      this.personPublicationsCombinedMatchesByReview['unsure'] = {}
      await pMap(_.keys(this.publicationsGroupedByDoiByInstitutionReview['unsure']), (doi) => {
        // get match with highest confidence level and use that one
        if (!doisPresent[doi]) {
          const personPubs = this.publicationsGroupedByDoiByInstitutionReview['unsure'][doi]
          let currentPersonPub
          _.each(personPubs, (personPub, index) => {
            if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
              currentPersonPub = personPub
            }
          })

          const unsureAuthors = this.getInstitutionReviewedAuthors(doi, 'unsure')
          this.updateFilteredPersonPubCounts('unsure', unsureAuthors)
          doisPresent[doi] = true
          this.personPublicationsCombinedMatchesByReview['unsure'][doi] = currentPersonPub
        }
      }, { concurrency: 1 })

      this.personPublicationsCombinedMatchesByReview['rejected'] = {}
      await pMap(_.keys(this.publicationsGroupedByDoiByInstitutionReview['rejected']), (doi) => {
        // get match with highest confidence level and use that one
        if (!doisPresent[doi]) {
          const personPubs = this.publicationsGroupedByDoiByInstitutionReview['rejected'][doi]
          let currentPersonPub
          _.each(personPubs, (personPub, index) => {
            if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
              currentPersonPub = personPub
            }
          })

          const rejectedAuthors = this.getInstitutionReviewedAuthors(doi, 'rejected')
          this.updateFilteredPersonPubCounts('rejected', rejectedAuthors)
          doisPresent[doi] = true
          this.personPublicationsCombinedMatchesByReview['rejected'][doi] = currentPersonPub
        }
      }, { concurrency: 1 })

      this.personPublicationsCombinedMatchesByReview['pending'] = {}
      await pMap(_.keys(this.publicationsGroupedByDoiByInstitutionReview['pending']), (doi) => {
        // get match with highest confidence level and use that one
        if (!doisPresent[doi]) {
          const personPubs = this.publicationsGroupedByDoiByInstitutionReview['pending'][doi]
          let currentPersonPub
          _.each(personPubs, (personPub, index) => {
            if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
              currentPersonPub = personPub
            }
          })

          this.personPublicationsCombinedMatchesByReview['pending'][doi] = currentPersonPub
        }
      }, { concurrency: 1 })

      // now group by org review according to the selected institution review state
      if (!this.selectedInstitutionReviewState) {
        this.selectedInstitutionReviewState = 'Accepted'
      }
      this.personPublicationsCombinedMatchesByOrgReview = _.groupBy(this.personPublicationsCombinedMatchesByReview[this.selectedInstitutionReviewState.toLowerCase()], function (pub) {
        if (pub.org_reviews && pub.org_reviews.length > 0) {
          return pub.org_reviews[0].review_type
        } else {
          return 'pending'
        }
      })

      // fill out empty arrays if no array status
      _.each(this.reviewStates, (reviewState) => {
        if (!this.personPublicationsCombinedMatchesByOrgReview[reviewState]) {
          this.personPublicationsCombinedMatchesByOrgReview[reviewState] = []
        }
      })

      // put in pubs grouped by doi for each review status for both ND author review and center review status
      _.each(this.reviewStates, (reviewType) => {
        const publications = this.personPublicationsCombinedMatchesByOrgReview[reviewType]
        // first grab relevant person pubs from global list based dois in this list
        this.publicationsGroupedByDoiByOrgReview[reviewType] = _.groupBy(publications, (personPub) => {
          return `${personPub.publication.doi}`
        })
      })

      this.loadPersonsWithFilter()

      // initialize the list in view
      // console.log(`Unique funder names found: ${JSON.stringify(_.keys(this.uniqueFunders), null, 2)}`)
      // console.log(`Crossref Funders by Doi ${JSON.stringify(_.keys(this.fundersByDoi).length, null, 2)}`)
      // console.log(`Pubmed Funders by Doi ${JSON.stringify(_.keys(this.pubMedFundersByDoi).length, null, 2)}`)
      // console.log(`Combined Funders by Doi ${JSON.stringify(_.keys(this.combinedFundersByDoi).length, null, 2)}`)
      this.setCurrentPersonPublicationsCombinedMatches()
    },
    getFilteredPersonPubCount (reviewType, person) {
      if (this.filteredPersonPubCounts[reviewType] && this.filteredPersonPubCounts[reviewType][person.id]) {
        return this.filteredPersonPubCounts[reviewType][person.id]
      } else {
        return 0
      }
    },
    updateFilteredPersonPubCounts (reviewType, authors) {
      _.each(authors, (author) => {
        if (!this.filteredPersonPubCounts[reviewType]) {
          this.filteredPersonPubCounts[reviewType] = {}
        }
        if (this.filteredPersonPubCounts[reviewType][author.id]) {
          this.filteredPersonPubCounts[reviewType][author.id] += 1
        } else {
          this.filteredPersonPubCounts[reviewType][author.id] = 1
        }
      })
    },
    async filterPublications () {
      let filterOutCurrentPublication = false
      this.filteredPersonPublicationsCombinedMatchesByOrgReview = _.mapValues(
        this.personPublicationsCombinedMatchesByOrgReview,
        (personPublications) => {
          return _.filter(personPublications, (item) => {
            const authorString = (this.sortAuthorsByDoi[this.selectedInstitutionReviewState.toLowerCase()][item.publication.doi]) ? this.sortAuthorsByDoi[this.selectedInstitutionReviewState.toLowerCase()][item.publication.doi] : ''
            let includedInSelectedAuthors = true
            if (this.selectedCenterAuthor !== 'All') {
              // assumes the name value in the list of the same form as the author string
              const testAuthor = this.selectedCenterAuthor.toLowerCase().split('(')[0].trim()
              includedInSelectedAuthors = authorString.toLowerCase().includes(testAuthor)
            }
            const includedInAuthors = authorString.toLowerCase().includes(this.pubSearch.toLowerCase().trim())
            const includedInTitle = item.publication.title.toLowerCase().includes(this.pubSearch.toLowerCase().trim())
            const includePublication = includedInSelectedAuthors && (includedInTitle || includedInAuthors)
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
      // if (personPublication.confidencesets_aggregate &&
      //   personPublication.confidencesets_aggregate.nodes &&
      //   personPublication.confidencesets_aggregate.nodes.length > 0) {
      //   return personPublication.confidencesets_aggregate.nodes[0].value
      // } else {
      //   return personPublication.confidence
      // }
      return 0
    },
    async sortPublications () {
      // sort by confidence of pub title
      // apply any sorting applied
      console.log('sorting', this.selectedCenterPubSort)
      if (this.selectedCenterPubSort === 'Title') {
        this.personPublicationsCombinedMatches = _.sortBy(this.personPublicationsCombinedMatches, (personPub) => {
          return this.trimFirstArticles(personPub.publication.title)
        })
      } else if (this.selectedCenterPubSort === 'Authors') {
        console.log('trying to sort by author')
        this.personPublicationsCombinedMatches = _.sortBy(this.personPublicationsCombinedMatches, (personPub) => {
          return this.sortAuthorsByDoi[this.selectedInstitutionReviewState.toLowerCase()][personPub.publication.doi]
        })
      } else if (this.selectedCenterPubSort === 'Source') {
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
        // for now assume only one review, needs to be fixed later
        const pubsWithReviewResult = await this.$apollo.query({
          query: readPersonPublicationsAll(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max),
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications ${moment().format('HH:mm:ss:SSS')}`)
        console.log(`Starting query publications ND reviews ${moment().format('HH:mm:ss:SSS')}`)
        const personPubByIds = _.mapKeys(pubsWithReviewResult.data.persons_publications, (personPub) => {
          return personPub.id
        })
        // // for now assume only one review, needs to be fixed later
        const pubsWithNDReviewsResult = await this.$apollo.query({
          query: readPersonPublicationsReviews(_.keys(personPubByIds), 'ND'),
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications ND reviews ${moment().format('HH:mm:ss:SSS')}`)
        const personPubNDReviews = _.groupBy(pubsWithNDReviewsResult.data.reviews_persons_publications, (reviewPersonPub) => {
          return reviewPersonPub.persons_publications_id
        })

        console.log(`Starting query publications HCRI reviews ${moment().format('HH:mm:ss:SSS')}`)

        const pubsWithHCRIReviewsResult = await this.$apollo.query({
          query: readPersonPublicationsReviews(_.keys(personPubByIds), 'HCRI'),
          fetchPolicy: 'network-only'
        })
        // console.log('***', pubsWithReviewResult)
        console.log(`Finished query publications HCRI reviews ${moment().format('HH:mm:ss:SSS')}`)
        const personPubHCRIReviews = _.groupBy(pubsWithHCRIReviewsResult.data.reviews_persons_publications, (reviewPersonPub) => {
          return reviewPersonPub.persons_publications_id
        })
        // console.log(`Starting query publications ND Reviews ${moment().format('HH:mm:ss:SSS')}`)
        // // for now assume only one review, needs to be fixed later
        // const pubsWithReviewResultNDReviews = await this.$apollo.query({
        //   query: readPersonPublicationsNDReviews(_.keys(personPubConfidenceSets)),
        //   fetchPolicy: 'network-only'
        // })
        // // console.log('***', pubsWithReviewResult)
        // console.log(`Finished query publications ND Reviews ${moment().format('HH:mm:ss:SSS')}`)
        // const personPubNDReviews = _.mapKeys(pubsWithReviewResultNDReviews.data.persons_publications, (personPub) => {
        //   return personPub.id
        // })
        // // console.log(`Person pub nd reviews are: ${JSON.stringify(personPubNDReviews, null, 2)}`)
        // console.log(`Starting query publications HCRI Reviews ${moment().format('HH:mm:ss:SSS')}`)
        // // for now assume only one review, needs to be fixed later
        // const pubsWithReviewResultHCRIReviews = await this.$apollo.query({
        //   query: readPersonPublicationsHCRIReviews(this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max),
        //   fetchPolicy: 'network-only'
        // })
        // // console.log('***', pubsWithReviewResult)
        // console.log(`Finished query publications HCRI Reviews ${moment().format('HH:mm:ss:SSS')}`)
        // const personPubHCRIReviews = _.mapKeys(pubsWithReviewResultHCRIReviews.data.persons_publications, (personPub) => {
        //   return personPub.id
        // })
        console.log(`Start query publications authors ${moment().format('HH:mm:ss:SSS')}`)
        this.publications = _.map(pubsWithReviewResult.data.persons_publications, (personPub) => {
          // change doi to lowercase
          _.set(personPub.publication, 'doi', _.toLower(personPub.publication.doi))
          // _.set(personPub, 'confidencesets_aggregate', _.cloneDeep(personPubConfidenceSetsReviews[personPub.id].confidencesets_aggregate))
          _.set(personPub, 'reviews', _.cloneDeep(personPubNDReviews[personPub.id]))
          _.set(personPub, 'org_reviews', _.cloneDeep(personPubHCRIReviews[personPub.id]))
          return personPub
        })
        const publicationIds = _.map(this.publications, (pub) => {
          return pub.publication.id
        })
        // now query for authors for the publications (faster if done in second query)
        const pubsAuthorsResult = await this.$apollo.query({
          query: readAuthorsByPublications(publicationIds),
          fetchPolicy: 'network-only'
        })
        console.log(`Finished query publications authors ${moment().format('HH:mm:ss:SSS')}`)
        const authorsPubs = _.map(pubsAuthorsResult.data.publications, (pub) => {
          // change doi to lowercase
          _.set(pub, 'doi', _.toLower(pub.doi))
          return pub
        })
        const pubsWithAuthorsByDoi = _.groupBy(authorsPubs, (publication) => {
          return publication.doi
        })
        // now reduce to first instance by doi and authors array
        this.authorsByDoi = _.mapValues(pubsWithAuthorsByDoi, (publication) => {
          return (publication[0].authors) ? publication[0].authors : []
        })
        this.loadPersonPublicationsCombinedMatches()
      } catch (error) {
        this.publicationsLoaded = true
        this.publicationsLoadedError = true
        throw error
      }
      this.publicationsLoaded = true
    },
    getReviewedAuthor (personPublication) {
      const obj = _.clone(personPublication.person)
      // const confidenceset = personPublication.confidencesets_aggregate.nodes[0]
      // if (confidenceset) {
      //   _.set(obj, 'confidenceset_value', confidenceset['value'])
      // }
      // _.set(obj, 'confidenceset_value', 0)
      return obj
    },
    async loadPublication (personPublication) {
      this.clearPublication()
      this.personPublication = personPublication
      const personPublicationsByReview = await this.getDoiPersonPublicationsByReview(personPublication.publication.doi)
      const reviewedAuthors = []
      this.acceptedAuthors = _.map(personPublicationsByReview['accepted'], (personPub) => {
        const reviewedAuthor = this.getReviewedAuthor(personPub)
        reviewedAuthors.push(reviewedAuthor)
        return reviewedAuthor
      })
      this.rejectedAuthors = _.map(personPublicationsByReview['rejected'], (personPub) => {
        const reviewedAuthor = this.getReviewedAuthor(personPub)
        reviewedAuthors.push(reviewedAuthor)
        return reviewedAuthor
      })
      this.unsureAuthors = _.map(personPublicationsByReview['unsure'], (personPub) => {
        const reviewedAuthor = this.getReviewedAuthor(personPub)
        reviewedAuthors.push(reviewedAuthor)
        return reviewedAuthor
      })
      this.loadPublicationAuthors(personPublication, reviewedAuthors)
      // this.loadConfidenceSet(personPublication)
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
      _.set(this.publication, 'uniqueAwards', _.mapKeys(this.publication.awards, (award) => {
        return award.funder_award_identifier
      }))
      console.log(`Loaded Publication: ${JSON.stringify(this.publication)}`)
      this.publicationCitation = this.getCitationApa(this.publication.csl_string)
      if (this.publication.journal && this.publication.journal.journals_classifications_aggregate) {
        this.publicationJournalClassifications = _.map(this.publication.journal.journals_classifications_aggregate.nodes, (node) => {
          return node.classification
        })
      }
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
      // add the review for personPublications with the same doi in the list
      const personPubs = this.publicationsGroupedByDoi[personPublication.publication.doi]

      try {
        let mutateResults = []
        await _.each(personPubs, async (personPub) => {
          // const personPub = personPubs[0]
          console.log(`Adding Review for person publication: ${personPub.id}`)
          const mutateResult = await this.$apollo.mutate(
            insertReview(this.userId, personPub.id, reviewType, 'HCRI')
          )
          console.log('&&', reviewType, this.reviewTypeFilter)
          if (mutateResult && personPub.id === personPublication.id) {
            this.$refs[`personPub${index}`].hide()
            Vue.delete(this.personPublicationsCombinedMatches, index)
            // transfer from one review queue to the next primarily for counts, other sorting will shake out on reload when clicking the tab
            // remove from current lists
            _.unset(this.publicationsGroupedByDoiByOrgReview[this.reviewTypeFilter], personPublication.publication.doi)
            _.remove(this.personPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            _.remove(this.filteredPersonPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter], (pub) => {
              return pub.id === personPub.id
            })
            // add to new lists
            this.publicationsGroupedByDoiByOrgReview[reviewType][personPublication.publication.doi] = personPubs
            this.personPublicationsCombinedMatchesByOrgReview[reviewType].push(personPub)
            this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType].push(personPub)
            if (this.reviewTypeFilter === 'pending' && this.selectedPersonTotal === 'Pending') {
              const currentPersonIndex = _.findIndex(this.people, (person) => {
                return person.id === this.person.id
              })
              this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count -= 1
            } else if (this.selectedPersonTotal === 'Pending' && reviewType === 'pending') {
              const currentPersonIndex = _.findIndex(this.people, (person) => {
                return person.id === this.person.id
              })
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
      const query = _.trim(`${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${encodeURI(_.replace(query, / +/, '+'))}`
      this.displayUrl()
    },
    google2 () {
      const query = _.trim(`Notre Dame ${this.personPublication.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${encodeURI(_.replace(query, / +/, '+'))}`
      this.displayUrl()
    },
    google3 () {
      const query = _.trim(`nd.edu ${this.personPublication.publication.title}`)
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
      this.acceptedAuthors = []
      this.rejectedAuthors = []
      this.unsureAuthors = []
      this.links = []
      this.url = undefined
      this.publication = undefined
      this.publicationCitation = undefined
      this.publicationJournalClassifications = []
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
      this.selectedCenterAuthor = this.preferredSelectedCenterAuthor
      this.selectedPersonSort = this.preferredPersonSort
      this.selectedPersonTotal = this.preferredPersonTotal
      this.selectedPersonConfidence = this.preferredPersonConfidence
      this.selectedInstitutionReviewState = this.preferredInstitutionReviewState
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
    preferredSelectedCenterAuthor: get('filter/preferredSelectedCenterAuthor'),
    preferredPersonTotal: get('filter/preferredPersonTotal'),
    preferredPersonConfidence: get('filter/preferredPersonConfidence'),
    preferredInstitutionReviewState: get('filter/preferredInstitutionReviewState'),
    selectedInstitutions: sync('filter/selectedInstitutions'),
    institutionOptions: get('filter/institutionOptions'),
    centerAuthorOptions: sync('filter/centerAuthorOptions'),
    selectedPersonSort: sync('filter/selectedPersonSort'),
    selectedInstitutionReviewState: sync('filter/selectedInstitutionReviewState'),
    selectedPersonPubSort: sync('filter/selectedPersonPubSort'),
    selectedCenterPubSort: sync('filter/selectedCenterPubSort'),
    selectedCenterAuthor: sync('filter/selectedCenterAuthor'),
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
