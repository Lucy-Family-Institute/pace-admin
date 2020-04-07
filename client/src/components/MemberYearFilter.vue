<template>
  <div class="q-pa-md yearFilter">
    <q-range
      v-model="selectedMemberYears"
      :step="1"
      :min="yearMemberStaticMin"
      :max="yearMemberStaticMax"
      label-always
      snap
    />
    <q-item-label>Member of Center/Institute Year(s)</q-item-label>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'

import getMemberFilterYears from '../../../gql/getMemberFilterYears.gql'
import _ from 'lodash'
import moment from 'moment'

export default {
  data () {
    return {
    }
  },
  computed: {
    yearMemberStaticMin: sync('filter/yearMemberStaticMin'),
    yearMemberStaticMax: sync('filter/yearMemberStaticMax'),
    selectedMemberYears: sync('filter/selectedMemberYears')
  },
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      const memberResults = await this.$apollo.query({
        query: getMemberFilterYears
      })
      this.yearMemberStaticMin = new Date(_.get(memberResults, 'data.persons_aggregate.aggregate.min.start_date', 1800)).getFullYear()
      // set the max to the current year
      this.yearMemberStaticMax = Number.parseInt(moment().format('YYYY'))

      console.log(`Initialized member year min: ${this.yearMemberStaticMin} max: ${this.yearMemberStaticMax}`)
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
