<template>
  <div>
    <div class="q-pa-md">
      <q-splitter
        v-model="firstModel"
        unit="px"
        :style="{height: ($q.screen.height-56-16)+'px'}"
      >
        <template v-slot:before>
      <div class="q-pa-md row" style="width:100%">
        <div style="width:50%">
          <q-item-label class="text-h6" header>Center/Institute Review</q-item-label>
        </div>
        <div style="width:50%;align:right">
          <q-item>
            <q-select
              v-model="selectedCenter"
              :options="centerOptions"
              class="white"
              label="Review For:"
              v-if="isLoggedIn"
              map-options
              style="width: 200px"
            />
          </q-item>
          <!-- <q-item>
            <CenterSelect v-if="isLoggedIn" />
          </q-item> -->
        </div>
      </div>
          <MainFilter />
              <CenterReviewPubFilter />
              <q-tabs
                v-model="reviewTypeFilter"
                dense
              >
                <q-tab name="pending" :label="`Pending (${getPublicationsGroupedByTitleByOrgReviewCount('pending')})`" />
                <q-tab name="accepted" :label="`Accepted (${getPublicationsGroupedByTitleByOrgReviewCount('accepted')})`" />
                <q-tab name="rejected" :label="`Rejected (${getPublicationsGroupedByTitleByOrgReviewCount('rejected')})`" />
                <q-tab name="unsure" :label="`Unsure (${getPublicationsGroupedByTitleByOrgReviewCount('unsure')})`" />
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
              <q-item v-if="!publicationsCslLoaded && !publicationsLoadedError && publicationsLoaded">
                <q-item-label>Prepping Data for Download...
                  <q-spinner-ios
                    color="primary"
                    size="2em"
                    />
                </q-item-label>
              </q-item>
              <q-separator/>
              <download-csv
                v-if="publicationsLoaded && !publicationsLoadedError && publicationsCslLoaded"
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
                        <q-item-label v-if="selectedInstitutionReviewState === 'Accepted'" style="width:100%" class="text-grey-9" lines="1"><strong>{{selectedInstitutionReviewState}} Authors:</strong> {{ sortAuthorsByTitle[selectedInstitutionReviewState.toLowerCase()][getPublicationTitleKey(item.publication.title)] }}</q-item-label>
                        <q-item-label v-else style="width:100%" class="text-grey-9" lines="1"><strong>{{selectedInstitutionReviewState}} Authors:</strong> {{ sortAuthorsByTitle[selectedInstitutionReviewState.toLowerCase()][getPublicationTitleKey(item.publication.title)] }}</q-item-label>
                        <q-list class="q-pt-sm">
                          <q-btn
                            @click.capture.stop
                            rounded
                            dense
                            size="sm"
                            v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(getPersonPubSet(getPersonPubSetId(item.id)).personPublications)"
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
                    <q-card v-if="item.publication !== undefined && (role === 'ADMIN_REVIEWER' || role === 'CENTER_REVIEWER')">
                      <q-card-section dense align="center" class="text-center">
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
                          v-for="(personPub, index) in getSortedPersonPublicationsBySourceName(getPersonPubSet(getPersonPubSetId(personPublication.id)).personPublications)"
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
                    <q-card-section v-if="publication&&publication.title" class="text-left">
                      <q-item-label><b>Title:&nbsp;</b>{{ publication.title }}</q-item-label>
                    </q-card-section>
                    <q-card-section>
                      <q-item-label><b>Citation:</b> {{ publicationCitation }}</q-item-label>
                    </q-card-section>
                    <q-card-section v-if="publication&&publication.journal_title" class="text-left">
                      <q-item-label><b>Journal Title:&nbsp;</b>{{ publication.journal_title }}</q-item-label>
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
import readPublicationsCSL from '../gql/readPublicationsCSL'
// import readConfidenceSetItems from '../gql/readConfidenceSetItems'
import insertReview from '../gql/insertReview'
// import readUser from '../gql/readUser'
// import readInstitutions from '../gql/readInstitutions'
import _ from 'lodash'
import Cite from 'citation-js'

// import readPersonsByInstitutionByYear from '../gql/readPersonsByInstitutionByYear'
// import readPersonsByInstitutionByYearPendingPubs from '../gql/readPersonsByInstitutionByYearPendingPubs'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import readPublications from '../gql/readPublications'
// import readPendingPublications from '../../../gql/readPendingPublications.gql'
import readPersonPublicationsAll from '../gql/readPersonPublicationsAll'
import readPersonPublicationsConfSets from '../gql/readPersonPublicationsConfSets'
import readPersonPublicationsReviews from '../gql/readPersonPublicationsReviews'
import readAuthorsByPublications from '../gql/readAuthorsByPublications'
// import readPublicationsByReviewState from '../../../gql/readPublicationsByReviewState.gql'
import readPublication from '../../../gql/readPublication.gql'
// import * as service from '@porter/osf.io';

import CenterReviewPubFilter from '../components/CenterReviewPubFilter.vue'
import MainFilter from '../components/MainFilter.vue'
import sanitize from 'sanitize-filename'
import pMap from 'p-map'
import readPersonsByInstitutionByYearByOrganization from '../gql/readPersonsByInstitutionByYearByOrganization'
import readOrganizationsCenters from '../../../gql/readOrganizationsCenters.gql'

import VueFriendlyIframe from 'vue-friendly-iframe'
// import CenterSelect from '@/components/widgets/CenterSelect.vue'

export default {
  name: 'PageIndex',
  components: {
    CenterReviewPubFilter,
    MainFilter,
    'download-csv': JsonCSV,
    'vue-friendly-iframe': VueFriendlyIframe
    // CenterSelect
  },
  data: () => ({
    centerOptions: null,
    pubLoadCount: 0,
    reviewStates: undefined,
    selectedReviewState: undefined,
    institutionReviewState: undefined,
    dom,
    date,
    firstModel: 750,
    secondModel: 500,
    people: [],
    publications: [],
    citationsByTitle: {},

    // these are helper objects to connect personPubSets together
    // PersonPubId -> Person Pub Set ID Pointers
    personPubSetPointer: {},
    // PersonPubSet Id -> Person Pub Id list (i.e., the set itself)
    personPubSetsById: {},
    // the current index for personPubSets, will increment whenever adding a new one
    personPubSetIdIndex: 0,
    // store extra fields that take a long time to load
    publicationsByIds: {},
    personPublicationsById: {},
    personPubSetsByReviewType: {},
    personPublicationsKeys: {},
    publicationsGroupedByInstitutionReview: {},
    personPublicationsCombinedMatches: [],
    personPublicationsCombinedMatchesByReview: {},
    personPublicationsCombinedMatchesByOrgReview: {},
    filteredPersonPublicationsCombinedMatchesByOrgReview: {},
    publicationsGroupedByTitleByInstitutionReview: {},
    publicationsGroupedByTitleByOrgReview: {},
    publicationsGroupedByDoiByInstitutionReview: {},
    publicationsGroupedByDoiByOrgReview: {},
    sortAuthorsByTitle: {}, // map of title's to the matched author to sort by (i.e., the matched author with the lowest matched position)
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
    authorsByTitle: {},
    confidenceSetitems: [],
    confidenceSet: undefined,
    acceptedAuthors: [],
    rejectedAuthors: [],
    unsureAuthors: [],
    matchedPublicationAuthors: [],
    matchedPublicationAuthorsByTitle: {},
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
    publicationsCslLoaded: false,
    publicationsLoadedError: false,
    showProgressBar: false,
    reviewedAuthorColumns: [
      { name: 'confidence', align: 'left', label: 'Confidence', field: 'confidenceset_value', sortable: true },
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
    selectedCenter: function () {
      this.selectedCenterAuthor = this.preferredSelectedCenterAuthor
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
    getPersonPublicationsInSet (pubSet) {
      return _.map(pubSet.personPublicationIds, (pubId) => {
        return this.getPersonPublicationById(pubId)
      })
    },
    getMainPersonPubFromSet (pubSet) {
      return pubSet.mainPersonPub
    },
    // will link all personPubs in this list together
    linkPersonPubs (personPubList, reviewType) {
      // link all person pubs together in this list
      const totalPubs = personPubList.length
      _.each(personPubList, (personPub, index) => {
        // at last item do nothing
        try {
          if (index === 0 && totalPubs === 1) {
            // will start a new personpub set list if not already in one
            this.startPersonPubSet(personPub['id'], reviewType)
          } else if (index !== (totalPubs - 1)) {
            const nextPersonPub = _.nth(personPubList, (index + 1))
            this.linkPersonPubPair(personPub.id, nextPersonPub.id, reviewType)
          }
        } catch (error) {
          console.warn(`Warning, error on linking publications: ${error}`)
        }
      })
    },
    // this method will link person pubs by putting them in a person pub set
    // together.  If neither are already in a person pub set, they will be grouped together in a new set
    // If only one has a set, the other will be added to that set
    // If both are currently within a set, it will merge the two sets together
    linkPersonPubPair (personPub1Id, personPub2Id, reviewType) {
      const notInPersonPub1SetId = this.notInPersonPubSet(personPub1Id)
      const notInPersonPub2SetId = this.notInPersonPubSet(personPub2Id)
      const personPubSet1Id = this.getPersonPubSetId(personPub1Id)
      const personPubSet2Id = this.getPersonPubSetId(personPub2Id)
      if (notInPersonPub1SetId && notInPersonPub2SetId) {
        // neither one is in a set yet and just add to set list
        const newSetId = this.startPersonPubSet(personPub1Id, reviewType)
        this.addPersonPubToSet(newSetId, personPub2Id, reviewType)
      } else if (notInPersonPub2SetId) {
        this.addPersonPubToSet(personPubSet1Id, personPub2Id, reviewType)
      } else if (notInPersonPub1SetId) {
        this.addPersonPubToSet(personPubSet2Id, personPub1Id, reviewType)
      } else {
        // they are both in existing sets and need to merge them
        // do nothing if they have the same pubsetid as they are already
        // in the same set
        this.mergePersonPubSets(personPubSet1Id, personPubSet2Id, reviewType)
      }
    },
    mergePersonPubSets (set1Id, set2Id, reviewType) {
      // do nothing if they are the same set id
      if (set1Id !== set2Id) {
        // add items from set2 into set1 if not already there, assumes everything is up to date with pointers
        const set1 = this.getPersonPubSet(set1Id)
        const set2 = this.getPersonPubSet(set2Id)
        if (set1.reviewType !== reviewType || set2.reviewType !== reviewType) {
          const error = `Warning: Mismatch in reviewType for sets to be merged.  Expected: ${reviewType}, found set 1: ${set1.reviewType} set 2: ${set2.reviewType}`
          console.error(error)
        }
        const set2List = set2.personPublicationIds
        _.each(set2List, (personPubId) => {
          this.addPersonPubToSet(set1Id, personPubId, reviewType)
        })
        // destroy the set2List
        this.removePersonPubSet(set2Id)
      }
    },
    removePersonPubSet (setId) {
      // only works if personPubs in this set already pointing to another one, else throw error
      // do nothing if set already gone
      const set = this.getPersonPubSet(setId)
      if (set) {
        _.each(set, (personPubId) => {
          if (setId && this.getPersonPubSetId(personPubId) === setId) {
            const error = `Warning: Cannot remove person Pub Set (on merge), personPubId: ${personPubId} not in any other set`
            console.error(error)
          }
        })
        // if we get this far no errors encountered, and all person pubs are now in another set
        // go ahead and delete it
        _.unset(this.personPubSetsById, setId)
      }
    },
    addPersonPubToSet (setId, personPubId, reviewType) {
      // proceed if set exists
      const set = this.getPersonPubSet(setId)
      if (set) {
        // do nothing if already in the set
        if (this.getPersonPubSetId(personPubId) !== setId) {
          if (set.reviewType !== reviewType) {
            const error = `Warning: Failed to add person pub to set with mismatched review types. Expected ${reviewType}, found: ${set.reviewType}`
            console.error(error)
          }
          const addPub = this.getPersonPublicationById(personPubId)
          this.personPubSetsById[setId].personPublicationIds = _.concat(this.personPubSetsById[setId].personPublicationIds, personPubId)
          this.personPubSetsById[setId].personPublications = _.concat(this.personPubSetsById[setId].personPublications, addPub)
          this.personPubSetPointer[personPubId] = setId
          const mainPersonPub = this.getPersonPublicationById(set.mainPersonPubId)
          if (!set.mainPersonPubId || this.getPublicationConfidence(mainPersonPub) < this.getPublicationConfidence(addPub)) {
            _.set(set, 'mainPersonPub', addPub)
            _.set(set, 'mainPersonPubId', addPub.id)
          }
        }
      } else {
        const error = `Warning: Failed to add personPub with id: ${personPubId} to set id: ${setId}, personPubSet does not exist`
        console.error(error)
      }
    },
    notInPersonPubSet (personPubId) {
      // true if already in a set
      return !this.personPubSetPointer[personPubId]
    },
    getPersonPubSet (setId) {
      return this.personPubSetsById[setId]
    },
    // this method is not currently thread-safe
    // creates a new person pub set if one does not already exist for the given
    // person Pub Id
    startPersonPubSet (personPubId, reviewType) {
      if (this.notInPersonPubSet(personPubId)) {
        const personPubSetId = this.getNextPersonPubSetId()
        this.personPubSetPointer[personPubId] = personPubSetId
        const personPub = this.getPersonPublicationById(personPubId)
        this.personPubSetsById[personPubSetId] = {
          personPublicationIds: [personPubId],
          personPublications: [personPub],
          mainPersonPubId: personPubId,
          mainPersonPub: personPub,
          reviewType: reviewType
        }
        return personPubSetId
      } else {
        const currentSetId = this.getPersonPubSetId(personPubId)
        const currentSet = this.getPersonPubSet(currentSetId)
        if (currentSet.reviewType !== reviewType) {
          const error = `Warning: Mismatch on review type for person Pub set for personPub id: ${personPubId}, expected review type: ${reviewType} and found review type: ${currentSet.reviewType}`
          console.error(error)
        } else {
          return this.getPersonPubSetId(personPubId)
        }
      }
    },
    getPersonPublicationById (personPubId) {
      return this.personPublicationsById[personPubId]
    },
    // returns a person Pub set if it exists for that personPub, else returns undefined
    getPersonPubSetId (personPubId) {
      return this.personPubSetPointer[personPubId]
    },
    // this method is not currently thread-safe
    getNextPersonPubSetId () {
      this.personPubSetIdIndex += 1
      return this.personPubSetIdIndex
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
    getSimpleFormatAuthorName (authorName) {
      let obj = (authorName) ? authorName.split('(')[0] : ''
      obj = obj.replace(' ', '_').replace(',', '')
      return obj.toLowerCase().trim()
    },
    getPublicationSourceId (personPublication) {
      let publication = this.publicationsByIds[personPublication.publication_id]
      if (!publication) publication = personPublication.publication
      if (publication.source_name.toLowerCase() === 'scopus' &&
        publication.scopus_eid) {
        return publication.scopus_eid
      } else if (publication.source_name.toLowerCase() === 'semanticscholar' &&
        publication.semantic_scholar_id) {
        return publication.semantic_scholar_id
      } else if (publication.source_name.toLowerCase() === 'webofscience') {
        return (publication.wos_id && publication.wos_id['_text'] ? publication.wos_id['_text'] : undefined)
      } else if (publication.source_name.toLowerCase() === 'pubmed' &&
        publication.pubmed_resource_identifiers &&
        _.isArray(publication.pubmed_resource_identifiers)) {
        const resourceId = _.find(publication.pubmed_resource_identifiers, (id) => {
          return id['resourceIdentifierType'] === 'pmc'
        })
        if (resourceId) {
          return resourceId['resourceIdentifier']
        } else {
          return undefined
        }
      } else if (publication.source_name.toLowerCase() === 'crossref') {
        return publication.doi
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
      let display = sourceName
      if (sourceId) {
        display = `${sourceName}: ${sourceId}`
      }
      // truncate display if needed
      return `${_.truncate(display, 16)}`
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
        } else if (personPublication.publication.source_name.toLowerCase() === 'webofscience') {
          return this.getWebOfScienceUri(sourceId)
        } else if (personPublication.publication.source_name.toLowerCase() === 'semanticscholar') {
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
    getPublicationsGroupedByTitleByOrgReviewCount (reviewType) {
      return this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType] ? this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType].length : 0
    },
    getTitlePersonPublicationsByReview (titleKey) {
      const personPubsByReview = {}
      _.each(_.keys(this.publicationsGroupedByTitleByInstitutionReview), (reviewType) => {
        if (this.publicationsGroupedByTitleByInstitutionReview[reviewType][titleKey]) {
          const pubsGroupedByPersonId = _.groupBy(this.publicationsGroupedByTitleByInstitutionReview[reviewType][titleKey], (personPub) => {
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
          console.warn(`Duplicate doi found: ${doi} items: ${JSON.stringify(pubsByDoi[doi], null, 2)}`)
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
          this.progress = 0.95
          this.buffer = 0.95
          return
        }

        let increment = 0.1
        if (this.progress > 0.6) increment = 0.01
        this.progress = Math.min(1, this.buffer, this.progress + increment)
      }, 700 + Math.random() * 1000)

      this.bufferInterval = setInterval(() => {
        if (this.buffer < 1) {
          this.buffer = Math.min(1, this.buffer + Math.random() * 0.2)
        }
      }, 700)
    },
    async showReviewState (reviewState) {
      const test = _.includes(this.filterReviewStates, reviewState.name)
      return test
    },
    async setSelectedReviewState (reviewState) {
      this.selectedReviewState = reviewState
    },
    async scrollToPublication (index) {
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
          await this.$refs['pubScroll'].scrollTo(newScrollIndex)

          if (pubIsExpanded) {
            this.$refs[`personPub${currentPubIndex}`].show()
          }
        } else {
          // clear everything out
          this.clearPublication()
        }
      }
    },
    async loadPersonsWithFilter () {
      this.people = []
      const personResult = await this.$apollo.query(readPersonsByInstitutionByYearByOrganization(this.selectedCenter.value, this.selectedInstitutions, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max, 0.0))
      this.people = personResult.data.persons

      // apply any sorting applied
      // if (this.selectedPersonSort === 'Name') {
      this.people = await _.sortBy(this.people, ['family_name', 'given_name'])
      //   } else {
      //     // need to sort by total and then name, not guaranteed to be in order from what is returned from DB
      //     // first group items by count
      //     const peopleByCounts = await _.groupBy(this.people, (person) => {
      //       return this.getFilteredPersonPubCount(this.selectedInstitutionReviewState.toLowerCase(), person)
      //     })

      //     // sort each person array by name for each count
      //     const peopleByCountsByName = await _.mapValues(peopleByCounts, (persons) => {
      //       return _.sortBy(persons, ['family_name', 'given_name'])
      //     })

      //     // get array of counts (i.e., keys) sorted in reverse
      //     const sortedCounts = await _.sortBy(_.keys(peopleByCountsByName), (count) => { return Number.parseInt(count) }).reverse()

      //     // now push values into array in desc order of count and flatten
      //     let sortedPersons = []
      //     await _.each(sortedCounts, (key) => {
      //       sortedPersons.push(peopleByCountsByName[key])
      //     })

      //     this.people = await _.flatten(sortedPersons)
      //     // this.reportDuplicatePublications()
      //   }
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
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewTypes
      })
      this.reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
        return typeReview.value
      })
      this.showReviewStates = _.filter(this.reviewStates, (value) => { return this.showReviewState(value) })
    },
    async loadPersons () {
      const personResult = await this.$apollo.query(readPersons())
      this.people = personResult.data.persons
    },
    removeSpaces (value) {
      if (_.isString(value)) {
        return _.clone(value).replace(/\s/g, '')
      } else {
        return value
      }
    },
    // replace diacritics with alphabetic character equivalents
    normalizeString (value, lowerCase, removeSpaces) {
      if (_.isString(value)) {
        let newValue = _.clone(value)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .replace(/[\u2019]/g, '\u0027') // the u0027 also normalizes the curly apostrophe to the straight one
          .replace(/[&\\#,+()$~%.'":*?<>{}!-]/g, '') // remove periods and other remaining special characters
        if (lowerCase) {
          newValue = _.lowerCase(newValue)
        }
        if (removeSpaces) {
          return this.removeSpaces(newValue)
        } else {
          return newValue
        }
      } else {
        return value
      }
    },
    // remove diacritic characters (used later for fuzzy matching of names)
    normalizeObjectProperties (object, properties) {
      const newObject = _.clone(object)
      _.each(properties, (property) => {
        newObject[property] = this.normalizeString(newObject[property], false, false)
      })
      return newObject
    },
    lastNameMatchFuzzy (last, lastKey, nameMap) {
      // first normalize the diacritics
      const testNameMap = _.map(nameMap, (name) => {
        return this.normalizeObjectProperties(name, [lastKey])
      })
      // normalize last name checking against as well
      const testLast = this.normalizeString(last, false, false)
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
      // load up author positions of possible matches
      this.matchedPublicationAuthors = this.getMatchedPublicationAuthors(personPublication, reviewedAuthors)
    },
    // async loadConfidenceSet (personPublication) {
    //   this.confidenceSetItems = []
    //   this.confidenceSet = undefined
    //   if (personPublication.confidencesets_aggregate &&
    //     personPublication.confidencesets_aggregate.nodes.length > 0) {
    //     this.confidenceSet = personPublication.confidencesets_aggregate.nodes[0]
    //     const result = await this.$apollo.query(readConfidenceSetItems(this.confidenceSet.id))
    //     this.confidenceSetItems = result.data.confidencesets_items
    //     this.confidenceSetItems = _.transform(this.confidenceSetItems, (result, setItem) => {
    //       _.set(setItem, 'confidence_type_name', setItem.confidence_type.name)
    //       _.set(setItem, 'confidence_type_rank', setItem.confidence_type.rank)
    //       _.set(setItem, 'confidence_type_desc', setItem.confidence_type.description)
    //       result.push(setItem)
    //     }, [])
    //   }
    // },
    async fetchData () {
      const results = await this.$apollo.query({
        query: readOrganizationsCenters
      })

      this.centerOptions = _.map(results.data.review_organization, (reviewOrg) => {
        return {
          label: reviewOrg.comment,
          value: reviewOrg.value
        }
      })

      const centerValues = _.map(this.centerOptions, (option) => { return option.value })
      if (this.selectedCenter && this.selectedCenter.value && !_.includes(centerValues, this.selectedCenter.value)) {
        // if a value not in list change to preferred
        this.selectedCenter = undefined
      }

      if (!this.selectedCenter || !this.selectedCenter.value) {
        this.selectedCenter = this.preferredSelectedCenter
      }
      await this.loadReviewStates()
      await this.loadPublications()
    },
    async clearPublications () {
      this.publications = []
      this.publicationsByIds = {}
      this.citationsByTitle = {}
      this.people = []
      await this.loadCenterAuthorOptions()
      this.personPubSetsById = {}
      this.personPubSetPointer = {}
      this.personPubSetIdIndex = 0
      this.personPublicationsById = {}
      this.personPubSetsByReviewType = {}
      this.personPublicationKeys = {}
      this.publicationsGroupedByInstitutionReview = {}
      this.personPublicationsCombinedMatches = []
      this.personPublicationsCombinedMatchesByReview = {}
      this.personPublicationsCombinedMatchesByOrgReview = {}
      this.filteredPersonPublicationsCombinedMatchesByOrgReview = {}
      this.publicationsGroupedByTitleByOrgReview = {}
      this.publicationsGroupedByTitleByInstitutionReview = {}
      this.publicationsGroupedByDoiByOrgReview = {}
      this.publicationsGroupedByDoiByInstitutionReview = {}
      this.confidenceSetItems = []
      this.confidenceSet = undefined
      this.filteredPersonPubCounts = {}
      this.sortAuthorsByTitle = {}
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
    getPublicationTitleKey (title) {
      // normalize the string and remove characters like dashes as well
      return this.normalizeString(title, true, true)
    },
    getPublicationDoiKey (publication) {
      let doiKey
      if (!publication.doi || publication.doi === null || this.removeSpaces(publication.doi) === '') {
        if (publication.source_name && publication.source_id) {
          doiKey = `${publication.source_name}_${publication.source_id}`
        }
      } else {
        doiKey = publication.doi
      }
      return doiKey
    },
    getPubCSVResultObject (personPublication) {
      const titleKey = this.getPublicationTitleKey(personPublication.publication.title)
      const citation = (this.citationsByTitle[titleKey] ? this.citationsByTitle[titleKey] : undefined)
      return {
        authors: this.sortAuthorsByTitle[this.selectedInstitutionReviewState.toLowerCase()][titleKey],
        title: personPublication.publication.title.replace(/\n/g, ' '),
        doi: this.getCSVHyperLinkString(personPublication.publication.doi, this.getDoiUrl(personPublication.publication.doi)),
        journal: (personPublication.publication.journal_title) ? personPublication.publication.journal_title : '',
        year: personPublication.publication.year,
        source_names: JSON.stringify(_.map(this.getSortedPersonPublicationsBySourceName(this.getPersonPubSet(this.getPersonPubSetId(personPublication.id)).personPublications), (pub) => { return pub.publication.source_name })),
        sources: this.getSourceUriString(this.getSortedPersonPublicationsBySourceName(this.getPersonPubSet(this.getPersonPubSetId(personPublication.id)).personPublications)),
        abstract: personPublication.publication.abstract,
        citation: citation
      }
    },
    getCSVHyperLinkString (showText, url) {
      return `${url}`
    },
    async loadPersonPublicationsCombinedMatches () {
      // this.fundersByDoi = {}
      // this.pubMedFundersByDoi = {}
      // this.combinedFundersByDoi = {}
      // this.uniqueFunders = {}
      this.filteredPersonPubCounts = {}
      // group by institution (i.e., ND author) review and then by doi
      // let pubsByTitle = {}
      const thisVue = this
      this.publicationsGroupedByInstitutionReview = _.groupBy(thisVue.publications, function (personPub) {
        let reviewType = 'pending'
        if (!thisVue.personPublicationsById) thisVue.personPublicationsById = {}
        thisVue.personPublicationsById[personPub.id] = personPub
        // const title = personPub.publication.title
        // if (doi === '10.1101/gad.307116.117') {
        // }
        if (personPub.reviews && personPub.reviews.length > 0) {
          reviewType = personPub.reviews[0].review_type
        }
        return reviewType
      })

      // put in pubs grouped by doi for each review status
      // this.publicationsGroupedByTitleByInstitutionReview = pubsByTitle

      // start add code for pubsets
      // map both by shared title and by shared doi and merged lists together later
      // put in pubs grouped by doi for each review status
      _.each(this.reviewStates, (reviewType) => {
        const publications = this.publicationsGroupedByInstitutionReview[reviewType]

        // seed the personPublication keys
        _.each(publications, (personPub) => {
          this.personPublicationsKeys[personPub.id] = {
            titleKey: this.getPublicationTitleKey(personPub.publication.title),
            doiKey: this.getPublicationDoiKey(personPub.publication)
          }
        })
        this.publicationsGroupedByTitleByInstitutionReview[reviewType] = _.groupBy(publications, (personPub) => {
          // let title = personPub.publication.title
          const titleKey = this.personPublicationsKeys[personPub.id].titleKey
          if (titleKey) {
            return `${titleKey}`
          } else {
            return undefined
          }
        })

        this.publicationsGroupedByDoiByInstitutionReview[reviewType] = _.groupBy(publications, (personPub) => {
          // let doi = personPub.publication.doi
          const doiKey = this.personPublicationsKeys[personPub.id].doiKey
          return doiKey
        })

        // grab one with highest confidence to display and grab others via title later when changing status

        // this.personPublicationsCombinedMatchesByReview[reviewType] = {}
        // keep a map of personPubId to set id in order to find the set that something should be added to if found as same pub
        // merge personPubs together by title and then doi
        _.each(_.keys(this.publicationsGroupedByTitleByInstitutionReview[reviewType]), (titleKey) => {
          if (titleKey && titleKey.length > 0) {
            this.linkPersonPubs(this.publicationsGroupedByTitleByInstitutionReview[reviewType][titleKey], reviewType)
          } else {
            // make independent pub sets for each
            _.each(this.publicationsGroupedByTitleByInstitutionReview[reviewType][titleKey], (pubSet) => {
              this.linkPersonPubs([pubSet], reviewType)
            })
          }
        })

        // now link together if same doi (if already found above will add to existing set)
        _.each(_.keys(this.publicationsGroupedByDoiByInstitutionReview[reviewType]), (doiKey) => {
          if (doiKey !== undefined && doiKey !== 'undefined' && doiKey !== null && this.removeSpaces(doiKey) !== '') {
            this.linkPersonPubs(this.publicationsGroupedByDoiByInstitutionReview[reviewType][doiKey], reviewType)
          } else {
            // do separate pubset for each doi
            _.each(this.publicationsGroupedByDoiByInstitutionReview[reviewType][doiKey], (pubSet) => {
              this.linkPersonPubs([pubSet], reviewType)
            })
          }
        })

        // get match with highest confidence level and use that one
        //     let currentPersonPub
        //   _.each(personPubs, (personPub, index) => {
        //     if (!currentPersonPub || this.getPublicationConfidence(currentPersonPub) < this.getPublicationConfidence(personPub)) {
        //       currentPersonPub = personPub
        //     }
        //   })
        //   return currentPersonPub
        // })
      })

      // group pub sets by review type
      this.personPubSetsByReviewType = _.groupBy(_.values(this.personPubSetsById), (pubSet) => {
        return pubSet.reviewType
      })

      // now group main pubs from pubset into separate combined matches map for display to make faster (fixes flicker in chip color for source)
      this.personPublicationsCombinedMatchesByReview = _.mapValues(this.personPubSetsByReviewType, (pubSets) => {
        return _.map(pubSets, (pubSet) => {
          return pubSet.mainPersonPub
        })
      })
      // end add code for pubsets
      // initialize the pub author matches
      this.matchedPublicationAuthorsByTitle = _.mapValues(this.authorsByTitle, (cslAuthors, titleKey) => {
        return this.getMatchedCslAuthors(cslAuthors, this.publicationsGroupedByTitleByInstitutionReview['accepted'][titleKey], true)
      })
      this.sortAuthorsByTitle = {}
      this.sortAuthorsByTitle['accepted'] = _.mapValues(this.matchedPublicationAuthorsByTitle, (matchedAuthors) => {
        this.updateFilteredPersonPubCounts('accepted', matchedAuthors)
        return this.getAuthorsString(matchedAuthors)
      })

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

      this.loadPersonsWithFilter()

      // initialize the list in view
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
            const titleKey = this.getPublicationTitleKey(item.publication.title)
            const authorString = (this.sortAuthorsByTitle[this.selectedInstitutionReviewState.toLowerCase()][titleKey]) ? this.sortAuthorsByTitle[this.selectedInstitutionReviewState.toLowerCase()][titleKey] : ''
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
      if (personPublication.confidencesets &&
        personPublication.confidencesets &&
        personPublication.confidencesets.length > 0) {
        return personPublication.confidencesets[0].value
      } else {
        // no confidence for this person?
        return personPublication.confidence
      }
    },
    async sortPublications () {
      // sort by confidence of pub title
      // apply any sorting applied
      if (this.selectedCenterPubSort === 'Title') {
        this.personPublicationsCombinedMatches = _.sortBy(this.personPublicationsCombinedMatches, (personPub) => {
          return this.trimFirstArticles(personPub.publication.title)
        })
      } else if (this.selectedCenterPubSort === 'Authors') {
        this.personPublicationsCombinedMatches = _.sortBy(this.personPublicationsCombinedMatches, (personPub) => {
          const titleKey = this.getPublicationTitleKey(personPub.publication.title)
          return this.sortAuthorsByTitle[this.selectedInstitutionReviewState.toLowerCase()][titleKey]
        })
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
      const currentLoadCount = this.pubLoadCount + 1
      this.pubLoadCount += 1
      this.clearPublication()
      this.clearPublications()
      this.startProgressBar()
      this.publicationsLoaded = false
      this.publicationsLoadedError = false
      this.publicationsCslLoaded = false
      // clear any previous publications in list
      this.clearPublications()
      // const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      // this.publications = result.data.publications
      try {
        // for now assume only one review, needs to be fixed later
        const pubsWithReviewResult = await this.$apollo.query({
          query: readPersonPublicationsAll(this.selectedInstitutions, this.selectedCenter.value, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max),
          fetchPolicy: 'network-only'
        })

        const personPubByIds = _.mapKeys(pubsWithReviewResult.data.persons_publications, (personPub) => {
          return personPub.id
        })
        // // for now assume only one review, needs to be fixed later
        const pubsWithNDReviewsResult = await this.$apollo.query({
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

        const pubsWithCenterReviewsResult = await this.$apollo.query({
          query: readPersonPublicationsReviews(_.keys(personPubByIds), this.selectedCenter.value),
          fetchPolicy: 'network-only'
        })

        const personPubCenterReviews = _.groupBy(pubsWithCenterReviewsResult.data.reviews_persons_publications, (reviewPersonPub) => {
          return reviewPersonPub.persons_publications_id
        })
        // // for now assume only one review, needs to be fixed later
        const pubsWithConfResult = await this.$apollo.query({
          query: readPersonPublicationsConfSets(this.selectedInstitutions, this.selectedCenter.value, this.selectedPubYears.min, this.selectedPubYears.max, this.selectedMemberYears.min, this.selectedMemberYears.max),
          fetchPolicy: 'network-only'
        })

        const personPubConfidenceSets = _.groupBy(pubsWithConfResult.data.confidencesets_persons_publications, (confPersonPub) => {
          return confPersonPub.persons_publications_id
        })
        let singlePubIdsByTitle = {}

        if (currentLoadCount === this.pubLoadCount) {
          this.publications = _.map(personPubNDReviewsAccepted, (personPubReview) => {
            const personPub = personPubByIds[personPubReview.persons_publications_id]
            // const personPub = personPubNDReviewsAccepted[personPubId]
            // grab the publication id and push to map to eliminate any dups
            singlePubIdsByTitle[_.toLower(personPubReview.title)] = personPubReview.publication_id
            // change doi to lowercase
            _.set(personPub.publication, 'doi', _.toLower(personPubReview.doi))
            _.set(personPub, 'confidencesets', _.cloneDeep(personPubConfidenceSets[personPubReview.persons_publications_id]))
            _.set(personPub, 'reviews', _.cloneDeep(personPubNDReviews[personPubReview.persons_publications_id]))
            _.set(personPub, 'org_reviews', _.cloneDeep(personPubCenterReviews[personPubReview.persons_publications_id]))
            return personPub
          })
        }

        const publicationIds = _.values(singlePubIdsByTitle)
        let pubsWithAuthorsByTitle
        if (currentLoadCount === this.pubLoadCount) {
          // now query for authors for the publications (faster if done in second query)
          const pubsAuthorsResult = await this.$apollo.query({
            query: readAuthorsByPublications(publicationIds),
            fetchPolicy: 'network-only'
          })
          const authorsPubs = _.map(pubsAuthorsResult.data.publications, (pub) => {
            // change doi to lowercase
            _.set(pub, 'doi', _.toLower(pub.doi))
            return pub
          })
          pubsWithAuthorsByTitle = _.groupBy(authorsPubs, (publication) => {
            return this.getPublicationTitleKey(publication.title)
          })
        }

        if (currentLoadCount === this.pubLoadCount) {
          // now reduce to first instance by title and authors array
          this.authorsByTitle = _.mapValues(pubsWithAuthorsByTitle, (publication) => {
            return (publication[0].authors) ? publication[0].authors : []
          })
          await this.loadPersonPublicationsCombinedMatches()
          this.publicationsLoaded = true
        }

        if (currentLoadCount === this.pubLoadCount) {
          await this.loadPublicationsCSLData(publicationIds)
          this.publicationsCslLoaded = true
        } else {
          console.warn('Reload of publications detected, aborting this process')
        }
      } catch (error) {
        this.publicationsLoaded = true
        this.publicationsLoadedError = true
        this.publicationsCslLoaded = true
        throw error
      }
      this.publicationsLoaded = true
    },
    async loadPublicationsCSLData (publicationIds) {
      this.citationsByTitle = {}
      // break publicationIds into chunks of 50
      const batches = _.chunk(publicationIds, 2000)
      let batchesPubsCSLByTitle = []
      const indexThis = this
      await pMap(batches, async (batch, index) => {
        const pubsCSLResult = await this.$apollo.query({
          query: readPublicationsCSL(batch),
          fetchPolicy: 'network-only'
        })

        batchesPubsCSLByTitle.push(_.groupBy(pubsCSLResult.data.publications, (publication) => {
          indexThis.publicationsByIds[publication.id] = publication
          return this.getPublicationTitleKey(publication.title)
        }))
      }, { concurrency: 1 })

      // generate the citations themselves
      await pMap(batchesPubsCSLByTitle, async (pubsCSLByTitle) => {
        await pMap(_.keys(pubsCSLByTitle), async (titleKey) => {
          if (!this.citationsByTitle[titleKey]) {
            this.citationsByTitle[titleKey] = this.getCitationApa(pubsCSLByTitle[titleKey][0].csl_string)
          }
        }, { concurrency: 1 })
      }, { concurrency: 1 })
    },
    getReviewedAuthor (personPublication) {
      const obj = _.clone(personPublication.person)
      const confidenceset = (personPublication.confidencesets && personPublication.confidencesets[0] ? personPublication.confidencesets[0] : undefined)
      if (confidenceset) {
        _.set(obj, 'confidenceset_value', confidenceset['value'])
      } else {
        console.warn(`Warning no confidence set found for person pubication: ${personPublication.id}`)
      }
      return obj
    },
    async loadPublicationById (publicationId) {
      const result = await this.$apollo.query({
        query: readPublication,
        variables: {
          publicationId: publicationId
        }
      })
      return result.data.publications[0]
    },
    async loadPublication (personPublication) {
      this.clearPublication()
      this.personPublication = personPublication
      const personPublicationsByReview = await this.getTitlePersonPublicationsByReview(this.getPublicationTitleKey(personPublication.publication.title))
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
      this.publicationCitation = this.getCitationApa(this.publication.csl_string)
      if (this.publication.journal && this.publication.journal.journals_classifications_aggregate) {
        this.publicationJournalClassifications = _.map(this.publication.journal.journals_classifications_aggregate.nodes, (node) => {
          return node.classification
        })
      }
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
        console.error(error)
      } finally {
      }
    },
    // async refreshReviewQueue () {
    //   this.reviewQueueKey += 1
    // },
    async addReview (index, person, personPublication, reviewType) {
      if (reviewType === this.reviewTypeFilter) {
        // If the reviewType we're adding is the same as the current filter, don't do anything
        // TODO deselect buttons that are the same as the current filter
        return null
      }
      // add the review for personPublications with the same title in the list
      const pubSet = this.getPersonPubSet(this.getPersonPubSetId(personPublication.id))
      const personPubs = pubSet.personPublications
      try {
        let mutateResults = []
        await _.each(personPubs, async (personPub) => {
          // const personPub = personPubs[0]
          let selectedCenterValue = this.selectedCenter.value
          if (!selectedCenterValue) {
            selectedCenterValue = this.preferredSelectedCenter.value
          }
          const mutateResult = await this.$apollo.mutate(
            insertReview(personPub.id, reviewType, selectedCenterValue)
          )
          if (mutateResult && personPub.id === personPublication.id) {
            this.$refs[`personPub${index}`].hide()
            Vue.delete(this.personPublicationsCombinedMatches, index)
          }
          mutateResults.push(mutateResult)
          this.publicationsReloadPending = true
        })
        // remove set from related lists
        this.personPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter] = _.filter(this.personPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter], (personPub) => {
          return pubSet.mainPersonPub.id !== personPub.id
        })
        this.filteredPersonPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter] = _.filter(this.filteredPersonPublicationsCombinedMatchesByOrgReview[this.reviewTypeFilter], (curPub) => {
          return pubSet.mainPersonPub.id !== curPub.id
        })
        // add to new lists
        this.personPublicationsCombinedMatchesByOrgReview[reviewType].push(pubSet.mainPersonPub)
        this.filteredPersonPublicationsCombinedMatchesByOrgReview[reviewType].push(pubSet.mainPersonPub)
        if (this.reviewTypeFilter === 'pending' && this.selectedPersonTotal === 'Pending') {
          const currentPersonIndex = _.findIndex(this.people, (person) => {
            console.log('persons', person, this.person)
            return person.id === this.person.id // todo Rick, this.person never defined, right?
          })
          this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count -= 1
        } else if (this.selectedPersonTotal === 'Pending' && reviewType === 'pending') {
          const currentPersonIndex = _.findIndex(this.people, (person) => {
            return person.id === this.person.id // todo Rick, this.person never defined, right?
          })
          this.people[currentPersonIndex].persons_publications_metadata_aggregate.aggregate.count += 1
        }
        this.clearPublication()
        return mutateResults
      } catch (error) {
        console.error(error)
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

      years = _.sortBy(years, (year) => { return year === null ? 99999 : Number.parseInt(year) }) // .reverse()
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
        console.warn(`Was unable to update publication year for citation with error: ${error}`)
      }

      const citeObj = new Cite(csl)
      // create formatted citation as test
      const apaCitation = citeObj.format('bibliography', {
        template: 'apa'
      })
      const decodedCitation = this.decode(apaCitation)
      // trim trailing whitespace and remove any newlines in the citation
      return _.trim(decodedCitation.replace(/(\r\n|\n|\r)/gm, ' '))
    },
    resetFilters () {
      this.selectedPersonPubSort = this.preferredPersonPubSort
      this.selectedCenterPubSort = this.preferredCenterPubSort
      this.selectedCenterAuthor = this.preferredSelectedCenterAuthor
      this.selectedPersonSort = this.preferredPersonSort
      this.selectedPersonTotal = this.preferredPersonTotal
      this.selectedPersonConfidence = this.preferredPersonConfidence
      this.selectedInstitutionReviewState = 'Accepted' // this.preferredInstitutionReviewState
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
    role: sync('auth/role'),
    selectedCenter: sync('filter/selectedCenter'),
    preferredSelectedCenter: sync('filter/preferredSelectedCenter'),
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
