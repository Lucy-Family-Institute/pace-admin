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
    <q-item-label header>
      <q-input v-model="pubSearch" label="">
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-item-label>
    <q-item dense>
      <q-select
        name="sort_person"
        v-model="selectedPersonPubSort"
        :options="sortPersonPubOptions"
        color="primary"
        filled
        label="Sort Publications By:"
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
      ],
      preferredPersonPubSort: 'Confidence'
    }
  },
  computed: {
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
      // console.log(`Loaded Review State Options: ${this.reviewStateOptions}`)
      this.selectedPersonPubSort = this.preferredPersonPubSort
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
