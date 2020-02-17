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
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
import _ from 'lodash'

import readInstitutions from '../../../gql/readInstitutions.gql'

export default {
  data () {
    return {
      institutionOptions: []
    }
  },
  computed: {
    selectedInstitutions: sync('filter/selectedInstitutions')
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
    }
  }
}
</script>

<style scoped>
  .fullSelect {
    width: 100%
  }
</style>
