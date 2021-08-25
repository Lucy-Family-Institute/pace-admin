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
// import _ from 'lodash'

// import readReviewStates from '../../../gql/readReviewStates.gql'

export default {
  data () {
    return {
      sortPersonPubOptions: [
        'Confidence',
        'Title'
      ]
    }
  },
  computed: {
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
      // const results = await this.$apollo.query({
      //   query: readReviewStates
      // })
      // this.reviewStateOptions = _.compact(_.map(results.data.reviewstates, 'name'))
      // this.filterReviewStates = _.clone(this.reviewStateOptions)
      this.selectedPersonPubSort = (this.selectedPersonPubSort) ? this.selectedPersonPubSort : this.preferredPersonPubSort
      this.pubSearch = ''
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
