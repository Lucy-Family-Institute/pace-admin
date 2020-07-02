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
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="bar" :options="yearBarOptions" :series="yearBarSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="classificationPieOptions" :series="classificationPieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="journalTypePieOptions" :series="journalTypePieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="publisherPieOptions" :series="publisherPieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <NetworkD3 />
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
import NetworkD3 from '../components/NetworkD3.vue'
import _ from 'lodash'
import { debounce } from 'quasar'

export default {
  name: 'PageIndex',
  components: {
    NetworkD3,
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
            }.bind(this),
            click: function ({ clientX, clientY }, chartContext, { config, globals }) {
              const xCoords = globals.seriesXvalues[0]
              const categories = config.xaxis.categories
              // Find the x-axis + translation closest to the click
              const categoryIndex = _.indexOf(xCoords, _.reduce(xCoords, function (prev, curr) {
                return (Math.abs(curr + globals.translateX - clientX) < Math.abs(prev + globals.translateX - clientX) ? curr : prev)
              }))
              this.addFacetFilter('year', categories[categoryIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          categories: [2017, 2018, 2019, 2020],
          labels: {
            style: {
              cssClass: 'clickable'
            }
          }
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
              this.addFacetFilter('classificationsTopLevel', config.w.globals.labels[config.dataPointIndex])
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
          enabled: true
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
    // refreshCharts: sync('filter/refreshCharts')
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
      if (_.includes(this.facetFilters, `${key}:${value}`)) return
      if (key === 'year') {
        this.removeFacetFilter(_.find(this.facetFilters, (val) => _.startsWith(val, key)))
      }
      this.facetFilters.push(`${key}:${value}`)
    },
    async removeFacetFilter (key) {
      this.$delete(this.facetFilters, _.indexOf(this.facetFilters, key))
    },
    async updateGraphs () {
      this.yearBarSeries = [{
        data: _.values(this.facetsDistribution.year)
      }]
      const classificationData = _.orderBy(
        _.map(this.facetsDistribution.classificationsTopLevel, (value, key) => {
          return { name: key, count: value }
        }),
        'count',
        'desc'
      )
      this.classificationPieSeries = _.map(classificationData, 'count')
      this.classificationPieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('classificationsTopLevel', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        labels: _.map(_.map(classificationData, 'name'), _.startCase),
        legend: {
          show: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        tooltip: {
          enabled: false
        }
      }
      this.journalTypePieSeries = _.values(this.facetsDistribution.journal_type)
      this.journalTypePieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('journal_type', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        labels: _.map(_.keys(this.facetsDistribution.journal_type), _.startCase),
        legend: {
          show: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        tooltip: {
          enabled: false
        }
      }
      const publisherData = _.orderBy(
        _.map(this.facetsDistribution.publisher, (value, key) => {
          return { name: key, count: value }
        }),
        'count',
        'desc'
      )
      this.publisherPieSeries = _.map(publisherData, 'count')
      this.publisherPieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('publisher', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          }
        },
        labels: _.map(_.map(publisherData, 'name'), _.startCase),
        legend: {
          show: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return opt.w.globals.labels[opt.seriesIndex]
          }
        },
        tooltip: {
          enabled: true
        }
      }
    }
  }
}
</script>

<style lang="sass">
.my-card
  width: 100%
  max-width: 450px

.clickable
   text-decoration: underline
</style>
