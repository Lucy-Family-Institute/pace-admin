<template>
  <q-page class="flex" style="background-color:white">
    <div class="" :style="(dashboardMiniState) ? 'width:1000px' : ''">
      <div class="row no-wrap">
        <div v-if="dashboardMiniState" class="col-auto">
          <download-csv
            class="cursor-pointer"
            :name="`pace_dashboard_results.csv`"
            :data="getPublicationsCSVResult(results)">
            <q-btn flat
              style="align:left;width:100%"
              icon="cloud_download"
              color="blue"
            >
              <q-item-section header align="left">&nbsp;Download Results</q-item-section>
            </q-btn>
          </download-csv>
        </div>
        <div v-if="dashboardMiniState" class="q-gutter-xs">
          <q-chip
            v-for="option in queryOptions"
            v-bind:key="option"
            removable @remove="removeFacetFilter(option)" color="primary" text-color="white"
          >
            {{cleanChip(option)}}
          </q-chip>
        </div>
      </div>
      <div class="row no-wrap">
        <!--<q-splitter
          unit="px"
          :style="{height: ($q.screen.height-56-16)+'px'}"
        >-->
          <!--<template v-slot:before>-->
            <div v-if="dashboardMiniState" style="width:300">
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
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Author</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.authors" :key="item.name" @click='addFacetFilter("authors", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Journal Impact Factor</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.impact_factor_range" :key="item.name" @click='addFacetFilter("impact_factor_range", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Journal</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.journal" :key="item.name" @click='addFacetFilter("journal", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Funder</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.funder" :key="item.name" @click='addFacetFilter("funder", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Subject</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.classifications" :key="item.name" @click='addFacetFilter("classifications", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Publisher</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.publisher" :key="item.name" @click='addFacetFilter("publisher", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
              <q-card class="my-card" flat bordered>
                <q-card class="my-card" bordered>
                  <q-card-section>
                    <q-item-label align="center"><strong>Publication Type</strong></q-item-label>
                  </q-card-section>
                </q-card>
                <q-card-section>
                  <q-scroll-area :visible="true" style="height: 200px; max-width: 300px;">
                    <q-list v-for="item in facetLists.journal_type" :key="item.name" @click='addFacetFilter("journal_type", item.name)'>
                      <q-item clickable v-ripple v-if="item.count > 0">
                        <q-item-section>{{item.name}} ({{item.count}})</q-item-section>
                      </q-item>
                    </q-list>
                  </q-scroll-area>
                </q-card-section>
              </q-card>
            </div>
          <!--</template>
          <template v-slot:after>-->
            <div :class="(dashboardMiniState) ? 'col-9' : 'col-auto'">
              <div v-if="!dashboardMiniState" class="col-9">
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
                <div class="q-gutter-xs">
                  <q-chip
                    v-for="option in queryOptions"
                    v-bind:key="option"
                    removable @remove="removeFacetFilter(option)" color="primary" text-color="white"
                  >
                    {{cleanChip(option)}}
                  </q-chip>
                </div>
                <download-csv
                  class="cursor-pointer"
                  :name="`pace_dashboard_results.csv`"
                  :data="getPublicationsCSVResult(results)">
                  <q-btn flat
                    style="align:left;width:100%"
                    icon="cloud_download"
                    color="blue"
                  >
                    <q-item-section header align="left">&nbsp;Download Results</q-item-section>
                  </q-btn>
                </download-csv>
              </div>
              <!--<q-virtual-scroll
                :items="results"
                separator
                bordered
                :virtual-scroll-item-size="50"
              >
                <template v-slot="{ item, index }">
                  <q-item clickable v-ripple>
                  <q-item-section :ref="`personPub${index}`">
                    <q-item-label v-html="item._formatted.title" />
                    <q-item-label caption v-html="item._formatted.abstract" v-if="item.abstract" />
                  </q-item-section>
                </q-item>
                </template>
              </q-virtual-scroll>-->
              <q-list bordered separator v-for="result in results" :key="result.id">
                <q-item clickable v-ripple @click="browseTo(result.doi)">
                  <q-item-section>
                    <q-item-label v-html="result._formatted.title" />
                    <q-item-label caption v-html="makeAuthorList(result._formatted.authors)" v-if="result.authors" />
                    <q-item-label caption v-html="`Journal: ${result.journal} (IF ${result.impact_factor})`" v-if="result.journal" />
                    <q-item-label caption v-html="result._formatted.abstract" v-if="result.abstract" />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          <!--</template>
        </q-splitter>-->
      </div>
    </div>
  </q-page>
</template>

<script>
import MeiliSearch from 'meilisearch'
import JsonCSV from 'vue-json-csv'
import { sync } from 'vuex-pathify'
import pMap from 'p-map'
import _ from 'lodash'
import { debounce, openURL } from 'quasar'

export default {
  name: 'Search',
  components: {
    'download-csv': JsonCSV
  },
  data () {
    return {
      yearsInitialized: false,
      search: '',
      processingTime: undefined,
      numberOfHits: undefined,
      facetLists: {},
      filters: ''
    }
  },
  async created () {
    await this.init()
    this.sortFacets = debounce(this.sortFacets, 500)
  },
  computed: {
    dashboardMiniState: sync('filter/dashboardMiniState'),
    facetFilters: sync('filter/facetFilters'),
    facetsDistribution: sync('filter/facetsDistribution'),
    results: sync('filter/results'),
    queryOptions: function () {
      return this.facetFilters // _.concat
    }
  },
  watch: {
    $route: 'init',
    search: async function (newText, oldText) {
      this.runSearch()
    },
    facetFilters: async function () {
      this.runSearch()
    }
  },
  methods: {
    async init () {
      const searchClient = new MeiliSearch({
        host: process.env.MEILI_PUBLIC_URL,
        apiKey: process.env.MEILI_PUBLIC_KEY
      })
      this.indexPublications = await searchClient.getIndex('publications')
      this.runSearch()
    },
    makeAuthorList (authors) {
      return _.join(authors, '; ')
    },
    async runSearch () {
      const searchfor = this.search ? this.search : '*'
      const options = {
        facetsDistribution: ['year', 'authors', 'classifications', 'journal', 'journal_type', 'publisher', 'classificationsTopLevel', 'funder', 'impact_factor_range'],
        attributesToHighlight: ['title', 'abstract', 'authors'],
        limit: 1000
      }
      if (!_.isEmpty(this.facetFilters)) {
        options.facetFilters = this.facetFilters
      }
      if (this.filters !== '') {
        options.filters = this.filters
      }

      // options.filters = 'classifications_identifiers < 2000'
      const results = await this.indexPublications.search(searchfor, options)
      // if (forDownload) {
      //   this.downloadResults = results.hits
      // } else {
      this.results = results.hits
      this.processingTime = results.processingTimeMs
      this.numberOfHits = results.nbHits
      this.facetsDistribution = Object.freeze(results.facetsDistribution)

      this.sortFacets(['classifications', 'authors', 'journal', 'journal_type', 'publisher', 'funder', 'impact_factor_range'], this.facetsDistribution)
      // }
    },
    makeStartCase (word) {
      // doing this instead of lodash startcase as that removes characters
      return word.replace(/\w+/g, _.capitalize)
    },
    async sortFacets (fields, data) {
      pMap(fields, async (field) => {
        this.$set(this.facetLists, field, Object.freeze(
          _.orderBy(
            _.map(data[field], (value, key) => {
              if (field === 'funder') {
                return { name: _.toUpper(key), count: value }
              } else {
                return { name: this.makeStartCase(key), count: value }
              }
            }),
            'count',
            'desc'
          )
        ))
      })
    },
    getPublicationsCSVResult (results) {
      return _.map(results, (result) => {
        return this.getPubCSVResultObject(result)
      })
    },
    getPubCSVResultObject (result) {
      return {
        authors: result.authors,
        title: result.title.replace(/\n/g, ' '),
        doi: this.getCSVHyperLinkString(result.doi, this.getDoiUrl(result.doi)),
        journal: (result.journal) ? result.journal : '',
        publisher: (result.publisher) ? result.publisher : '',
        year: result.year,
        journal_impact_factor: (result.impact_factor) ? result.impact_factor : '',
        classification: (result.classifications) ? result.classifications : '',
        abstract: (result.abstract) ? result.abstract : '',
        citation: (result.citation) ? result.citation : ''
      }
    },
    getCSVHyperLinkString (showText, url) {
      return `${url}`
    },
    getDoiUrl (doi) {
      const doiBaseUrl = 'https://dx.doi.org'
      return `${doiBaseUrl}/${doi}`
    },
    async reset () {
      this.facetFilters = []
      this.search = ''
      await this.runSearch()
    },
    async removeSelectedFacet (key) {
      this.facetFilters = _.filter(this.facetFilters, (facetFilter) => {
        const testKey = facetFilter.split(':')[0]
        return (key !== testKey)
      })
    },
    async toggleFacetFilter (key, value) {
      this.removeSelectedFacet(key)
      this.facetFilters.push(`${key}:${value}`)
      await this.runSearch()
    },
    async addFacetFilter (key, value) {
      if (_.includes(this.facetFilters, `${key}:${value}`)) return
      if (key === 'year') {
        this.removeFacetFilter(_.find(this.facetFilters, (val) => _.startsWith(val, key)))
      }
      this.facetFilters.push(`${key}:${value}`)
      this.dashboardMiniState = true
    },
    async setFilter () {
      // this.filters = `ages > ${this.ages.min} AND ages < ${this.ages.max}`
    },
    async removeFacetFilter (key) {
      this.$delete(this.facetFilters, _.indexOf(this.facetFilters, key))
    },
    async browseTo (doi) {
      openURL(this.getDoiUrl(doi))
    },
    cleanChip (label) {
      return _.replace(label, /(.*):/, '')
    }
  }
}
</script>

<style lang="sass" scoped>

</style>
