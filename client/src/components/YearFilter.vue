<template>
  <div class="q-pa-md">
    <q-range
      v-model="years"
      :step="1"
      :min="years.min"
      :max="years.max"
      label-always
      snap
      @change="watchRange"
    />
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'

import getYearFilterYears from '../../../gql/getYearFilterYears.gql'
import _ from 'lodash'

export default {
  data () {
    return {
      years: sync('filters/years')
    }
  },
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async watchRange () {
      console.log(this.years.min, this.years.max)
    },
    async fetchData () {
      const results = await this.$apollo.query({
        query: getYearFilterYears
      })
      console.log(results)
      this.years = {
        min: _.get(results, 'data.publications_aggregate.aggregate.min.year', 1800),
        max: _.get(results, 'data.publications_aggregate.aggregate.max.year', 2200)
      }
    }
  }
}
</script>

<style scoped>
</style>
