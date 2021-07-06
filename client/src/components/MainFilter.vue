<template>
  <q-list class="rounded-borders">
    <q-expansion-item
      v-model="filterView"
      expand-separator
      icon="tune"
      label="FILTER"
      class="text-grey-8"
      style="align:left;width:100%"
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
        </div>
        <div class="row">
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
      filterView: true
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
    pubSearch: sync('filter/pubSearch')
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
      console.log('loading review states')
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewTypes
      })
      // console.log(`Review Type Results: ${JSON.stringify(reviewStatesResult.data, null, 2)}`)
      this.reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
        // console.log(`Current type review is: ${JSON.stringify(typeReview, null, 2)}`)
        return typeReview.value
      })
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
