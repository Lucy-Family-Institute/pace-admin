<template>
  <div class="q-pa-md">
    <q-range
      v-model="years"
      :step="1"
      :min="yearStaticMin"
      :max="yearStaticMax"
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
      // years: sync('filters/years'),
      years: {
        min: null,
        max: null
      },
      yearStaticMin: 1900,
      yearStaticMax: 2200,
      selectedYearMin: sync('filters/selctedYearMax'),
      selectedYearMax: sync('filters/selctedYearMax')
    }
  },
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async watchRange (value) {
      this.selectedYearMin = value.min
      this.selectedYearMax = value.max
    },
    async fetchData () {
      const results = await this.$apollo.query({
        query: getYearFilterYears
      })
      this.yearStaticMin = _.get(results, 'data.publications_aggregate.aggregate.min.year', 1800)
      this.years.min = this.yearStaticMin
      this.yearStaticMax = _.get(results, 'data.publications_aggregate.aggregate.max.year', 2200)
      this.years.max = this.yearStaticMax
    }
  }
}
</script>

<style scoped>
</style>
