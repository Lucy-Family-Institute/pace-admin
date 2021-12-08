<template>
    <!--<q-item dense>
      <q-select
        filled
        v-model="filterReviewStates"
        multiple
        :options="reviewStateOptions"
        use-chips
        stack-label
        label="Review Status"
        class="fullSelect"
      />
    </q-item>-->
    <q-item header>
      <q-input v-model="pubSearch" label="" style="width:100%">
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>
      <!--<q-select
        name="institution_review"
        v-model="selectedInstitutionReviewState"
        :options="institutionReviewStateOptions"
        color="primary"
        filled
        style="width:325px"
        label="ND Author Review:"
        class="fullSelect"
      />-->
      <q-select
        name="sort_center_pub"
        v-model="selectedCenterPubSort"
        :options="sortCenterPubOptions"
        color="primary"
        filled
        style="width:210px"
        label="Sort By:"
        class="fullSelect"
      />
      <!--<q-select
        name="selected_authors"
        v-model="selectedCenterAuthor"
        :options="centerAuthorOptions"
        color="primary"
        filled
        style="width:400px"
        label="Author:"
        class="fullSelect"
      />-->
    </q-item>
</template>

<script>
import { sync } from 'vuex-pathify'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import _ from 'lodash'

export default {
  data () {
    return {
      sortCenterPubOptions: [
        'Title',
        'Authors'
      ],
      institutionReviewStateOptions: [
        'Accepted',
        'Rejected',
        'Unsure'
      ],
      reviewStates: undefined
    }
  },
  computed: {
    preferredInstitutionReviewState: sync('filter/preferredInstitutionReviewState'),
    selectedInstitutionReviewState: sync('filter/selectedInstitutionReviewState'),
    preferredCenterPubSort: sync('filter/preferredCenterPubSort'),
    // preferredSelectedCenterAuthor: sync('filter/preferredSelectedCenterAuthor'),
    selectedCenterPubSort: sync('filter/selectedCenterPubSort'),
    // selectedCenterAuthor: sync('filter/selectedCenterAuthor'),
    // centerAuthorOptions: sync('filter/centerAuthorOptions'),
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
      // this.selectedCenterAuthor = (this.selectedCenterAuthor) ? this.selectedCenterAuthor : this.preferredSelectedCenterAuthor
      this.pubSearch = ''
    },
    async loadReviewStates () {
      const reviewStatesResult = await this.$apollo.query({
        query: readReviewTypes
      })
      this.reviewStates = await _.map(reviewStatesResult.data.type_review, (typeReview) => {
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
