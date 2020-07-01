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
              <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="bar" :options="yearBarOptions" :series="yearBarSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="classificationPieOptions" :series="classificationPieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="journalTypePieOptions" :series="journalTypePieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="publisherPieOptions" :series="publisherPieSeries"></apexchart>
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
import SearchView from '../components/SearchView.vue'
import _ from 'lodash'
import { debounce } from 'quasar'

export default {
  name: 'PageIndex',
  components: {
    SearchView
  },
  data () {
    return {
      firstModel: 1000,
      yearBarOptions: {
        chart: {
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('year', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          categories: [2017, 2018, 2019, 2020]
        }
      },
      yearBarSeries: [{
        data: [2017, 2018, 2019, 2020]
      }],
      classificationPieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('classifications', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        legend: {
          show: false
        },
        labels: []
      },
      classificationPieSeries: [],
      journalTypePieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('journal_type', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        legend: {
          show: false
        },
        labels: ['Journal', 'Book Series']
      },
      journalTypePieSeries: [2017, 2018, 2019, 2020],
      publisherPieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('publisher', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        legend: {
          show: false
        },
        labels: ['Cambridge University Press', 'Ave Maria Press']
      },
      publisherPieSeries: ['Cambridge University Press', 'Ave Maria Press']
    }
  },
  async created () {
    await this.init()
    this.updateGraphs = debounce(this.updateGraphs, 500)
  },
  computed: {
    dashboardMiniState: sync('filter/dashboardMiniState'),
    facetFilters: sync('filter/facetFilters'),
    facetsDistribution: sync('filter/facetsDistribution')
  },
  watch: {
    $route: 'init',
    facetsDistribution: async function () {
      this.updateGraphs()
    }
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
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    },
    async addFacetFilter (key, value) {
      this.facetFilters.push(`${key}:${value}`)
    },
    async updateGraphs () {
      this.yearBarSeries = [{
        data: _.values(this.facetsDistribution.year)
      }]
      this.classificationPieSeries = _.values(this.facetsDistribution.classifications)
      this.classificationPieOptions = {
        labels: _.map(_.keys(this.facetsDistribution.classifications), _.startCase)
      }
      this.journalTypePieSeries = _.values(this.facetsDistribution.journal_type)
      this.journalTypePieOptions = {
        labels: _.map(_.keys(this.facetsDistribution.journal_type), _.startCase)
      }
      this.publisherPieSeries = _.values(this.facetsDistribution.publisher)
      this.publisherPieOptions = {
        labels: _.map(_.keys(this.facetsDistribution.publisher), _.startCase)
      }
    }
  }
}
</script>

<style lang="sass" scoped>
.my-card
  width: 100%
  max-width: 450px
</style>
