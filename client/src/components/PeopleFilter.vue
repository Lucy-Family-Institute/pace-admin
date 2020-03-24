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
      preferredPersonSort: 'Total'
    }
  },
  computed: {
    selectedInstitutions: sync('filter/selectedInstitutions'),
    selectedPersonSort: sync('filter/selectedPersonSort')
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
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
