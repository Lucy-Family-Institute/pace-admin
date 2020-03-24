<template>
  <div>
    <q-item dense>
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
    </q-item>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
import _ from 'lodash'

import readReviewStates from '../../../gql/readReviewStates.gql'

export default {
  data () {
    return {
      reviewStateOptions: []
    }
  },
  computed: {
    filterReviewStates: sync('filter/filterReviewStates')
  },
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      const results = await this.$apollo.query({
        query: readReviewStates
      })
      this.reviewStateOptions = _.compact(_.map(results.data.reviewstates, 'name'))
      this.filterReviewStates = _.clone(this.reviewStateOptions)
      console.log(`Loaded Review State Options: ${this.reviewStateOptions}`)
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
