<template>
  <q-page class="flex"  style="background-color:white">
    <div class="">
      <div class="row no-wrap">
        <div class="col-auto">
          <q-input v-model="search" filled type="search" bottom-slots debounce="100">
          <template v-slot:append>
            <q-icon name="close" @click="reset()" class="cursor-pointer" />
          </template>
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
            <template v-slot:hint v-if="results">
              {{numberOfHits}} hits in {{processingTime}} ms
            </template>
          </q-input>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart width="250" type="bar" :options="options" :series="series"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <q-scroll-area style="height: 200px; max-width: 300px;">
                <q-list v-for="author in authors" :key="author.name" @click='addFacetFilter("author", author.name)'>
                  <q-item clickable v-ripple v-if="author.count > 0">
                    <q-item-section>{{author.name}} ({{author.count}})</q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <q-scroll-area style="height: 200px; max-width: 300px;">
                <q-list v-for="author in classifications" :key="author.name" @click='addFacetFilter("classifications", author.name)'>
                  <q-item clickable v-ripple v-if="author.count > 0">
                    <q-item-section>{{author.name}} ({{author.count}})</q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <q-scroll-area style="height: 200px; max-width: 300px;">
                <q-list v-for="author in journals" :key="author.name" @click='addFacetFilter("journal", author.name)'>
                  <q-item clickable v-ripple v-if="author.count > 0">
                    <q-item-section>{{author.name}} ({{author.count}})</q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-10">
          <download-csv
            class="cursor-pointer"
            name='pace.csv'
            :data="results">
            Download Search Results
            <q-icon name="cloud_download" />
          </download-csv>
          <q-list bordered separator v-for="result in results" :key="result.id">
            <q-item clickable v-ripple>
              <q-item-section>
                <q-item-label v-html="result._formatted.title" />
                <q-item-label caption v-html="result._formatted.abstract" v-if="result.abstract" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import MeiliSearch from 'meilisearch'
import JsonCSV from 'vue-json-csv'
import _ from 'lodash'

export default {
  name: 'Search',
  components: {
    'download-csv': JsonCSV
  },
  data () {
    const that = this
    return {
      search: '',
      processingTime: undefined,
      numberOfHits: undefined,
      results: [],
      options: {
        chart: {
          events: {
            dataPointSelection: function (event, chartContext, config) {
              that.addFacetFilter('year', config.w.globals.labels[config.dataPointIndex])
            }
          }
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          categories: [2017, 2018, 2019, 2020]
        }
      },
      series: [{
        data: [1, 2, 3, 4]
      }],
      authors: {},
      classifications: {},
      journals: {},
      // filters: '',
      facetFilters: [],
      distributions: []
    }
  },
  async created () {
    await this.init()
  },
  computed: {
  },
  watch: {
    $route: 'init',
    search: async function (newText, oldText) {
      // this.filters = ''
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
      this.runSearch()
    },
    async runSearch () {
      const searchfor = this.search ? this.search : '*'

      const options = {
        facetsDistribution: ['year', 'author', 'classifications', 'journal'],
        attributesToHighlight: ['title', 'abstract']
      }
      // if (filter) {
      //   options.filters = filter
      // }
      if (!_.isEmpty(this.facetFilters)) {
        options.facetFilters = this.facetFilters
      }
      const results = await this.indexPublications.search(searchfor, options)
      this.results = results.hits
      this.processingTime = results.processingTimeMs
      this.numberOfHits = results.nbHits

      this.classifications = Object.freeze(_.orderBy(
        _.map(results.facetsDistribution.classifications, (value, key) => {
          return { name: key, count: value }
        }), 'count', 'desc'
      ))
      this.authors = Object.freeze(_.orderBy(
        _.map(results.facetsDistribution.author, (value, key) => {
          return { name: key, count: value }
        }), 'count', 'desc'
      ))
      this.journals = Object.freeze(_.orderBy(
        _.map(results.facetsDistribution.journal, (value, key) => {
          return { name: key, count: value }
        }), 'count', 'desc'
      ))
      this.series = [{
        name: 'series-1',
        data: _.values(results.facetsDistribution.year)
      }]
    },
    async reset () {
      this.facetFilters = []
      this.search = ''
      this.runSearch()
    },
    async addFacetFilter (key, value) {
      this.facetFilters.push(`${key}:${value}`)
      this.runSearch()
    }
  }
}
</script>

<style lang="sass" scoped>

</style>
