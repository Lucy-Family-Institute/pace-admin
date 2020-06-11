<template>
  <div>
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
      <q-select
        name="institution_review"
        v-model="selectedInstitutionReviewState"
        :options="institutionReviewStateOptions"
        color="primary"
        filled
        style="width:300px"
        label="ND Author Review:"
        class="fullSelect"
      />
      <q-select
        name="sort_person"
        v-model="selectedPersonPubSort"
        :options="sortPersonPubOptions"
        color="primary"
        filled
        style="width:180px"
        label="Sort By:"
        class="fullSelect"
      />
    </q-item>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
import readReviewTypes from '../../../gql/readReviewTypes.gql'
import _ from 'lodash'

export default {
  data () {
    return {
      sortPersonPubOptions: [
        'Confidence',
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
    preferredPersonPubSort: sync('filter/preferredPersonPubSort'),
    selectedPersonPubSort: sync('filter/selectedPersonPubSort'),
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
      this.selectedPersonPubSort = (this.selectedPersonPubSort) ? this.selectedPersonPubSort : this.preferredPersonPubSort
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
