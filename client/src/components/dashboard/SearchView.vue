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
            removable @remove="removeFacetFilter(option, true)" color="primary" text-color="white"
          >
            {{cleanChip(option)}}
          </q-chip>
        </div>
      </div>
      <div class="q-pa-md row" style="width:100%">
        <div class="col-9" style="width:100%">
          <q-item>
            <q-select
              v-model="selectedCenter"
              :options="reviewOptions"
              label="Select Center/Institute:"
              class="white"
              style="min-width: 250px"
            />
            &nbsp;&nbsp;
            <q-select
              v-if="dashboardMiniState"
              v-model="selectedYear"
              :options="yearOptions"
              label="Select Year Published:"
              class="white"
              style="min-width: 250px"
            />
          </q-item>
          <q-item v-if="!dashboardMiniState">
            <q-select
              v-model="selectedYear"
              :options="yearOptions"
              label="Select Year Published:"
              class="white"
              style="min-width: 250px"
            />
          </q-item>
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
                    removable @remove="removeFacetFilter(option, true)" color="primary" text-color="white"
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
      yearOptions: [],
      yearsInitialized: false,
      search: '',
      processingTime: undefined,
      numberOfHits: undefined,
      facetLists: {},
      filters: '',
      review_organizations: {},
      reviewOptions: []
    }
  },
  async created () {
    await this.init()
    this.sortFacets = debounce(this.sortFacets, 500)
  },
  computed: {
    dashboardMiniState: sync('dashboard/dashboardMiniState'),
    facetFilters: sync('dashboard/facetFilters'),
    facetsDistribution: sync('dashboard/facetsDistribution'),
    results: sync('dashboard/results'),
    selectedCenter: sync('dashboard/selectedCenter'),
    selectedYear: sync('dashboard/selectedYear'),
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
    },
    selectedCenter: function () {
      this.addFacetFilter('review_organization_label', this.selectedCenter.value)
    },
    selectedYear: function () {
      this.toggleFacetFilter('year', this.selectedYear.value)
    }
  },
  methods: {
    async init () {
      const searchClient = new MeiliSearch({
        host: '/api/search',
        apiKey: process.env.MEILI_PUBLIC_KEY
      })
      this.indexPublications = await searchClient.getIndex('publications')
      if (this.selectedYear) {
        this.addFacetFilter('year', this.selectedYear.value)
      }
      if (this.selectedCenter) {
        this.addFacetFilter('review_organization_label', this.selectedCenter.value)
      }
      this.runSearch()
    },
    makeAuthorList (authors) {
      return _.join(authors, '; ')
    },
    async runSearch () {
      const searchfor = this.search ? this.search : '*'
      const options = {
        facetsDistribution: ['year', 'authors', 'classifications', 'journal', 'journal_type', 'publisher', 'classificationsTopLevel', 'funder', 'impact_factor_range', 'review_organization_value', 'review_organization_label'],
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

      this.review_organizations = Object.freeze(_.orderBy(
        _.map(results.facetsDistribution.review_organization_label, (value, key) => {
          return { name: key, count: value }
        }), 'count', 'desc'
      ))
      this.reviewOptions = _.map(this.review_organizations, (reviewOrg) => {
        let label = _.toUpper(reviewOrg.name)
        if (!_.find(this.facetFilters, (val) => _.startsWith(val, 'review_organization_label'))) {
          label = `${label} (${reviewOrg.count})`
        }
        return {
          label: label,
          value: _.toUpper(reviewOrg.name)
        }
      })
      this.years = Object.freeze(_.orderBy(
        _.map(results.facetsDistribution.year, (value, key) => {
          return { name: key, count: value }
        }), 'count', 'desc'
      ))
      this.yearOptions = _.map(this.years, (yearOption) => {
        let label
        if (this.selectedYear === undefined) {
          label = `${yearOption.name} (${yearOption.count})`
        } else {
          label = yearOption.name
        }
        return {
          label: label,
          value: yearOption.name
        }
      })
      this.yearOptions = _.sortBy(this.yearOptions, (yearOption) => {
        return yearOption.value
      })

      this.sortFacets(['classifications', 'authors', 'journal', 'journal_type', 'publisher', 'funder', 'impact_factor_range', 'review_organization_value', 'review_organization_label'], this.facetsDistribution)
      // if (!this.selectedCenter) {
      //   this.selectedCenter = {
      //     label: this.reviewOptions[0].label,
      //     value: this.reviewOptions[0].value
      //   }
      // }
      // }
      if (!this.selectedYear) {
        const yearFacetValue = this.getFacetFilterValue('year')
        if (yearFacetValue) {
          this.selectedYear = {
            label: yearFacetValue,
            value: yearFacetValue
          }
        }
      }
      if (!this.selectedCenter) {
        const centerFacetValue = this.getFacetFilterValue('review_organization_label')
        if (centerFacetValue) {
          this.selectedCenter = {
            label: centerFacetValue,
            value: centerFacetValue
          }
        }
      }
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
              if (field === 'funder' || field === 'review_organization_label') {
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
    // returns undefined if not set
    getFacetFilterValue (key) {
      let value
      _.find(this.facetFilters, (facetFilter) => {
        const filter = facetFilter.split(':')
        const filterKey = filter[0]
        const filterValue = filter[1]
        if (key === filterKey) {
          value = filterValue
        }
      })
      return value
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
      if (key === 'year' || key === 'review_organization_value' || key === 'review_organization_label') {
        this.removeFacetFilter(_.find(this.facetFilters, (val) => _.startsWith(val, key)), false)
      }
      if (key === 'year') {
        const index = _.find(this.yearOptions, (yearOption, index) => {
          return yearOption.value === value
        })
        this.selectedYear = this.yearOptions[index]
      }
      this.facetFilters.push(`${key}:${value}`)
      this.dashboardMiniState = true
    },
    async setFilter () {
      // this.filters = `ages > ${this.ages.min} AND ages < ${this.ages.max}`
    },
    async removeFacetFilter (key, clearValue) {
      if (clearValue && (_.startsWith(key, 'review_organization_value') || _.startsWith(key, 'review_organization_label'))) {
        this.selectedCenter = undefined
      }
      if (clearValue && (_.startsWith(key, 'year') || _.startsWith(key, 'year'))) {
        this.selectedYear = undefined
      }
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
