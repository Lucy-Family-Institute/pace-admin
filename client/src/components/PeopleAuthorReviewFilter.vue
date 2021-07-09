<template>
  <div class="row">
  <div class="q-pa-md"  style="min-width:200px">
    <q-select
      filled
      v-model="selectedInstitutions"
      multiple
      :options="institutionOptions"
      use-chips
      stack-label
      label="Institutions"
      />
    <q-select
      name="sort_person"
      :key="personSortKey"
      v-model="selectedPersonSort"
      :options="sortPersonOptions"
      color="primary"
      filled
      label="Sort Person By:"
    />
  </div>
  <div class="q-pa-md"  style="min-width:250px">
    <q-select
      name="person_total"
      v-model="selectedPersonTotal"
      :options="personTotalOptions"
      color="primary"
      filled
      label="Show Total Counts:"
      class="fullSelect"
    />
    <q-select
      name="person_confidence"
      v-model="selectedPersonConfidence"
      :options="personConfidenceOptions"
      color="primary"
      filled
      label="Minimum Confidence:"
      class="fullSelect"
    />
  </div>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
import _ from 'lodash'

import readInstitutions from '../../../gql/readInstitutions.gql'

export default {
  data () {
    return {
      sortPersonOptions: [
        'Total',
        'Name'
      ],
      personTotalOptions: [
        'Pending',
        'All'
      ],
      personConfidenceOptions: [
        '50%',
        'All'
      ],
      filterMenuIcons: {
        'institution':
        {
          icon: 'account_balance',
          label: 'Institutions',
          separator: true
        }
      }
    }
  },
  computed: {
    personSortKey: sync('filter/personSortKey'),
    institutionOptions: sync('filter/institutionOptions'),
    preferredPersonTotal: sync('filter/preferredPersonTotal'),
    preferredPersonSort: sync('filter/preferredPersonSort'),
    selectedInstitutions: sync('filter/selectedInstitutions'),
    selectedPersonSort: sync('filter/selectedPersonSort'),
    selectedPersonTotal: sync('filter/selectedPersonTotal'),
    selectedPersonConfidence: sync('filter/selectedPersonConfidence')
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
        query: readInstitutions
      })
      this.institutionOptions = _.compact(_.map(results.data.institutions, 'name'))
      this.selectedInstitutions = (this.selectedInstitutions && this.selectedInstitutions.length > 0) ? this.selectedInstitutions : _.clone(this.institutionOptions)
      this.selectedPersonSort = (this.selectedPersonSort) ? this.selectedPersonSort : this.preferredPersonSort
      this.selectedPersonTotal = (this.selectedPersonTotal) ? this.selectedPersonTotal : this.preferredPersonTotal
      this.selectedPersonConfidence = (this.selectedPersonConfidence) ? this.selectedPersonConfidence : this.preferredPersonConfidence
    }
  }
}
</script>

<style scoped>
  .fullSelect {
   width: 100%;
  }
</style>
