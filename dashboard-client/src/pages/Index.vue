<template>
  <q-page class="flex justify-center no-wrap">
    <q-splitter
      v-model="firstModel"
      unit="px"
      :style="{height: ($q.screen.height-56-16)+'px'}"
      disable
    >
      <template v-slot:before>
        <div class="q-pa-md row items-start q-gutter-md">
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="bar" :options="yearOptions" :series="yearSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="classificationOptions" :series="classificationSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="journalTypeOptions" :series="journalTypeSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="bar" :options="journalOptions" :series="journalSeries"></apexchart>
            </q-card-section>
          </q-card>
        </div>
      </template>
      <template v-slot:separator>
        <q-btn
            dense
            round
            unelevated
            color="teal"
            :icon="`${(dashboardMiniState) ? 'chevron_right' : 'chevron_left'}`"
            @click="toggleMiniState"
          />
      </template>
      <template v-slot:after :style="{height: ($q.screen.height-56-16)+'px'}">
        <div style="padding-top: 16px">
          <SearchView />
        </div>
      </template>
    </q-splitter>
  </q-page>
</template>

<script>
import { sync } from 'vuex-pathify'
// import MeiliSearch from 'meilisearch'
import SearchView from '../components/SearchView.vue'

export default {
  name: 'PageIndex',
  components: {
    SearchView
  },
  data () {
    return {
      firstModel: 1000,
      search: '',
      drawer: true,
      processingTime: undefined,
      numberOfHits: undefined,
      results: [],
      options: {
        chart: {
          id: 'vuechart-example'
        },
        xaxis: {
          categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]
        }
      },
      series: [{
        name: 'series-1',
        data: [30, 40, 45, 50, 49, 60, 70, 91]
      }]
    }
  },
  async created () {
    await this.init()
  },
  computed: {
    hint: function () {
      return this.results ? `${this.numberOfHits} hits in ${this.processingTime} ms` : ''
    },
    yearOptions: sync('filter/yearOptions'),
    yearSeries: sync('filter/yearSeries'),
    journalTypeOptions: sync('filter/journalTypeOptions'),
    journalTypeSeries: sync('filter/journalTypeSeries'),
    classificationOptions: sync('filter/classificationOptions'),
    classificationSeries: sync('filter/classificationSeries'),
    refreshCharts: sync('filter/refreshCharts'),
    journalOptions: sync('filter/journalOptions'),
    journalSeries: sync('filter/journalSeries'),
    dashboardMiniState: sync('filter/dashboardMiniState')
  },
  watch: {
    $route: 'init'
    // search: async function (newText, oldText) {
    //   if (newText !== '') {
    //     this.runSearch(newText)
    //   } else {
    //     this.runSearch('*')
    //   }
    // }
  },
  methods: {
    toggleMiniState (e) {
      // if in "mini" state and user
      // click on drawer, we switch it to "normal" mode
      this.dashboardMiniState = !this.dashboardMiniState
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    },
    getFirstModelWidth (dashboardMiniState) {
      if (this.dashboardMiniState) {
        return this.$q.screen.width * 0.25
      } else {
        return this.$q.screen.width * 0.75
      }
    },
    async init () {
      // const searchClient = new MeiliSearch({
      //   host: 'http://127.0.0.1:7700'
      // })
      // this.indexPublications = await searchClient.getIndex('publications')
      // this.runSearch('*')
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    } //,
    // async runSearch (query) {
    //   const results = await this.indexPublications.search(query, {
    //     facetsDistribution: ['year', 'author', 'classifications']
    //   })
    //   this.processingTime = results.processingTimeMs
    //   this.numberOfHits = results.nbHits
    //   console.log(`${JSON.stringify(results.facetsDistribution.author)}`)
    //   this.results = results.hits
    // }
  }
}
</script>

<style lang="sass" scoped>
.my-card
  width: 100%
  max-width: 450px
</style>
