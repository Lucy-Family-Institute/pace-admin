<template>
  <div class="row">
  <div class="q-pa-md"  style="min-width:200px">
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
  <div class="q-pa-md"  style="min-width:200px">
    <q-select
      name="person_total"
      v-model="selectedPersonTotal"
      :options="personTotalOptions"
      color="primary"
      filled
      label="Show Total Counts:"
      class="fullSelect"
    />
  </div>
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'

export default {
  data () {
    return {
      sortPersonOptions: [
        'Total Counts',
        'Name'
      ],
      personTotalOptions: [
        'Pending Only',
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
    preferredPersonTotal: sync('filter/preferredPersonTotal'),
    preferredPersonSort: sync('filter/preferredPersonSort'),
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
      this.selectedPersonSort = (this.selectedPersonSort) ? this.selectedPersonSort : this.preferredPersonSort
      this.selectedPersonTotal = (this.selectedPersonTotal) ? this.selectedPersonTotal : this.preferredPersonTotal
    }
  }
}
</script>

<style scoped>
  .fullSelect {
   width: 100%;
  }
</style>
