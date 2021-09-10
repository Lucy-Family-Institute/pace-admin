<template>
  <div class="q-pa-md yearFilter" style="min-width:300px">
    <q-range
      v-model="selectedMemberYears"
      :step="1"
      :min="yearMemberStaticMin"
      :max="yearMemberStaticMax"
      @change="updateMemberYears()"
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
    selectedMemberYears: sync('filter/selectedMemberYears'),
    changedMemberYears: sync('filter/changedMemberYears')
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

      if (this.changedMemberYears === undefined) {
        this.selectedMemberYears = {
          min: this.yearMemberStaticMin,
          max: this.yearMemberStaticMax
        }
      }
    },
    async updateMemberYears () {
      this.changedMemberYears = this.selectedMemberYears
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
