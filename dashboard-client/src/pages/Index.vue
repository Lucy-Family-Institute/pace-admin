<template>
  <q-page class="flex justify-center no-wrap">
    <div class="q-pa-md row items-start q-gutter-md">
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart width="250" type="bar" :options="options" :series="series"></apexchart>
        </q-card-section>
      </q-card>
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart width="250" type="bar" :options="options" :series="series"></apexchart>
        </q-card-section>
      </q-card>
      <q-card class="my-card" flat bordered>
        <q-card-section>
          <apexchart width="250" type="bar" :options="options" :series="series"></apexchart>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import MeiliSearch from 'meilisearch'

export default {
  name: 'PageIndex',
  data () {
    return {
      search: '',
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
    }
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
    async init () {
      const searchClient = new MeiliSearch({
        host: 'http://127.0.0.1:7700'
      })
      this.indexPublications = await searchClient.getIndex('publications')
      this.runSearch('*')
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
  max-width: 300px
</style>
