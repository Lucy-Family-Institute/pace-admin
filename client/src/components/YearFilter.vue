<template>
  <div class="q-pa-md yearFilter">
    <q-range
      v-model="selectedYears"
      :step="1"
      :min="yearStaticMin"
      :max="yearStaticMax"
      label-always
      snap
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
    }
  },
  computed: {
    yearStaticMin: sync('filter/yearStaticMin'),
    yearStaticMax: sync('filter/yearStaticMax'),
    selectedYears: sync('filter/selectedYears')
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
        query: getYearFilterYears
      })
      this.yearStaticMin = _.get(results, 'data.publications_aggregate.aggregate.min.year', 1800)
      this.yearStaticMax = _.get(results, 'data.publications_aggregate.aggregate.max.year', 2200)

      console.log(`Initialized year min: ${this.yearStaticMin} max: ${this.yearStaticMax}`)
    }
  }
}
</script>

<style scoped>
  .yearFilter {
    padding-left: 40px;
    padding-right: 40px;
  }
</style>
