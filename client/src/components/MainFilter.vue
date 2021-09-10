<template>
  <q-list class="rounded-borders">
    <q-expansion-item
      v-model="filterView"
      expand-separator
      icon="tune"
      label="FILTER"
      class="text-grey-8"
      style="align:left;width:100%;border:solid;border-width:thin;border-color:#E0E0E0;"
    >
      <div>
        <q-item header>
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
        </q-item>
        <div class="row">
          <div>
            <MemberYearFilter />
          </div>
          <div>
            <YearFilter />
          </div>
          <div>
            <PeopleFilter />
          </div>
        </div>
      </div>
    </q-expansion-item>
    <div align="center" style="position:relative; bottom:20px">
      <q-btn
        v-if="filterView"
        dense
        round
        unelevated
        color="teal"
        icon="expand_less"
        @click="filterView = false"
      />
      <q-btn
        v-if="!filterView"
        dense
        round
        unelevated
        color="teal"
        icon="expand_more"
        @click="filterView = true"
      />
  </div>
  </q-list>
</template>

<script>
import { sync } from 'vuex-pathify'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import PeopleFilter from '../components/PeopleFilter.vue'
import YearFilter from '../components/YearFilter.vue'
import MemberYearFilter from '../components/MemberYearFilter.vue'
import _ from 'lodash'

export default {
  components: {
    PeopleFilter,
    YearFilter,
    MemberYearFilter
  },
  data () {
    return {
      sortCenterPubOptions: [
        'Confidence',
        'Title',
        'Authors'
      ],
      institutionReviewStateOptions: [
        'Accepted',
        'Rejected',
        'Unsure'
      ],
      reviewStates: undefined,
      filterView: false
    }
  },
  computed: {
    preferredInstitutionReviewState: sync('filter/preferredInstitutionReviewState'),
    selectedInstitutionReviewState: sync('filter/selectedInstitutionReviewState'),
    preferredCenterPubSort: sync('filter/preferredCenterPubSort'),
    preferredSelectedCenterAuthor: sync('filter/preferredSelectedCenterAuthor'),
    selectedCenterPubSort: sync('filter/selectedCenterPubSort'),
    selectedCenterAuthor: sync('filter/selectedCenterAuthor'),
    centerAuthorOptions: sync('filter/centerAuthorOptions'),
    selectedMemberYears: sync('filter/selectedMemberYears'),
    selectedInstitutions: sync('filter/selectedInstitutions'),
    institutionOptions: sync('filter/institutionOptions'),
    selectedPubYears: sync('filter/selectedPubYears'),
    selectedPersonConfidence: sync('filter/selectedPersonConfidence'),
    pubSearch: sync('filter/pubSearch'),
    preferredPersonTotal: sync('filter/preferredPersonTotal'),
    preferredPersonConfidence: sync('filter/preferredPersonConfidence'),
    yearPubStaticMin: sync('filter/yearPubStaticMin'),
    yearPubStaticMax: sync('filter/yearPubStaticMax'),
    yearMemberStaticMin: sync('filter/yearMemberStaticMin'),
    yearMemberStaticMax: sync('filter/yearMemberStaticMax'),
    changedPubYears: sync('filter/changedPubYears'),
    changedMemberYears: sync('filter/changedMemberYears')
  },
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      await this.loadReviewStates()
      this.selectedinstitutionReviewState = (this.selectedInstitutionReviewState) ? this.selectedinstitutionReviewState : this.preferredInstitutionReviewState
      this.selectedCenterPubSort = (this.selectedCenterPubSort) ? this.selectedCenterPubSort : this.preferredCenterPubSort
      this.selectedCenterAuthor = (this.selectedCenterAuthor) ? this.selectedCenterAuthor : this.preferredSelectedCenterAuthor
      this.pubSearch = ''
    },
    async loadReviewStates () {
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewTypes
      })
      this.reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
        return typeReview.value
      })
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
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
