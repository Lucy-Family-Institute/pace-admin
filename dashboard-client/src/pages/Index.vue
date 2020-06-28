<template>
  <q-page class="flex justify-center no-wrap">
    <q-drawer
        v-model="drawer"
        show-if-above
        side="left"
        :mini-width=325
        :mini="dashboardMiniState"

        :width="$q.screen.width * .8"
        :breakpoint="800"
        bordered
        content-class="bg-grey-3"
      >
       <div class="absolute" style="top: 15px; right: -17px">
          <q-btn
            dense
            round
            unelevated
            color="teal"
            :icon="`${(dashboardMiniState) ? 'chevron_right' : 'chevron_left'}`"
            @click="dashboardMiniState = !dashboardMiniState"
          />
        </div>
    <div class="q-pa-md row items-start q-gutter-md">
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .25}`" type="bar" :options="yearOptions" :series="yearSeries"></apexchart>
        </q-card-section>
      </q-card>
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .25}`" type="pie" :options="journalTypeOptions" :series="journalTypeSeries"></apexchart>
        </q-card-section>
      </q-card>
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .25}`" type="bar" :options="options" :series="series"></apexchart>
        </q-card-section>
      </q-card>
    </div>
      </q-drawer>
      <div>
        <SearchView />
      </div>
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
    dashboardMiniState: sync('filter/dashboardMiniState')
  },
  watch: {
    $route: 'init',
    search: async function (newText, oldText) {
      if (newText !== '') {
        this.runSearch(newText)
      } else {
        this.runSearch('*')
      }
    }
  },
  methods: {
    drawerClick (e) {
      // if in "mini" state and user
      // click on drawer, we switch it to "normal" mode
      if (this.dashboardMiniState) {
        this.dashboardMiniState = false

        // notice we have registered an event with capture flag;
        // we need to stop further propagation as this click is
        // intended for switching drawer to "normal" mode only
        e.stopPropagation()
      }
    },
    async init () {
      // const searchClient = new MeiliSearch({
      //   host: 'http://127.0.0.1:7700'
      // })
      // this.indexPublications = await searchClient.getIndex('publications')
      // this.runSearch('*')

    },
    async runSearch (query) {
      const results = await this.indexPublications.search(query, {
        facetsDistribution: ['year', 'author', 'classifications']
      })
      this.processingTime = results.processingTimeMs
      this.numberOfHits = results.nbHits
      console.log(`${JSON.stringify(results.facetsDistribution.author)}`)
      this.results = results.hits
    }
  }
}
</script>

<style lang="sass" scoped>
.my-card
  width: 100%
  max-width: 450px
</style>
