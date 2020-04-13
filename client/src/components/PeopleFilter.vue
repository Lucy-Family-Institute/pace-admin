<template>
  <div>
    <q-item dense>
      <q-select
        filled
        v-model="selectedInstitutions"
        multiple
        :options="institutionOptions"
        use-chips
        stack-label
        label="Institutions"
        class="fullSelect"
      />
    </q-item>
    <q-item dense>
      <q-select
        name="sort_person"
        v-model="selectedPersonSort"
        :options="sortPersonOptions"
        color="primary"
        filled
        label="Sort Person By:"
        class="fullSelect"
      />
      <q-select
        name="person_total"
        v-model="selectedPersonTotal"
        :options="personTotalOptions"
        color="primary"
        filled
        label="Total Counts:"
        class="fullSelect"
      />
    </q-item>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
import _ from 'lodash'

import readInstitutions from '../../../gql/readInstitutions.gql'

export default {
  data () {
    return {
      institutionOptions: [],
      sortPersonOptions: [
        'Total',
        'Name'
      ],
      personTotalOptions: [
        'Pending',
        'All'
      ],
      preferredPersonTotal: 'Pending',
      preferredPersonSort: 'Total'
    }
  },
  computed: {
    selectedInstitutions: sync('filter/selectedInstitutions'),
    selectedPersonSort: sync('filter/selectedPersonSort'),
    selectedPersonTotal: sync('filter/selectedPersonTotal')
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
      this.selectedInstitutions = _.clone(this.institutionOptions)
      this.selectedPersonSort = this.preferredPersonSort
      this.selectedPersonTotal = this.preferredPersonTotal
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
